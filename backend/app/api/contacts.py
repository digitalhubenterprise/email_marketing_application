import csv
import io
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import ContactList, Contact, User
from app.schemas.contact import (
    ContactListCreate, ContactListResponse,
    ContactCreate, ContactResponse, CSVImportResponse, ContactUpdate
)
from app.api.deps import get_current_user

router = APIRouter()

# Security limits
CSV_MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB max CSV upload
CSV_MAX_ROWS = 50_000                  # Maximum 50k contacts per upload
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


def is_valid_email(email: str) -> bool:
    """Validates email format using RFC 5322-compatible regex."""
    return bool(EMAIL_REGEX.match(email.strip()))


# ─────────────────────── Contact Lists ───────────────────────

@router.get("/lists", response_model=List[ContactListResponse])
async def list_contact_lists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(ContactList, func.count(Contact.id).label("contacts_count"))
        .outerjoin(Contact, Contact.list_id == ContactList.id)
        .where(ContactList.user_id == current_user.id)
        .group_by(ContactList.id)
        .order_by(ContactList.id.desc())
    )
    result = await db.execute(query)

    lists = []
    for row in result:
        contact_list, count = row
        lists.append(
            ContactListResponse(
                id=contact_list.id,
                user_id=contact_list.user_id,
                name=contact_list.name,
                description=contact_list.description,
                created_at=contact_list.created_at,
                contacts_count=count,
            )
        )
    return lists


@router.post("/lists", response_model=ContactListResponse, status_code=status.HTTP_201_CREATED)
async def create_contact_list(
    list_in: ContactListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Strip and validate name length
    name = list_in.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="List name cannot be empty.")
    if len(name) > 100:
        raise HTTPException(status_code=400, detail="List name must be 100 characters or fewer.")

    new_list = ContactList(
        user_id=current_user.id,
        name=name,
        description=(list_in.description or "").strip(),
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)

    return ContactListResponse(
        id=new_list.id,
        user_id=new_list.user_id,
        name=new_list.name,
        description=new_list.description,
        created_at=new_list.created_at,
        contacts_count=0,
    )


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id,
            ContactList.user_id == current_user.id,
        )
    )
    contact_list = result.scalars().first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="List not found.")

    await db.delete(contact_list)
    await db.commit()


# ─────────────────────── Contacts ───────────────────────

@router.get("/lists/{list_id}/contacts", response_model=List[ContactResponse])
async def list_contacts(
    list_id: int,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    list_check = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id, ContactList.user_id == current_user.id
        )
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found.")

    query = select(Contact).where(Contact.list_id == list_id)
    if tag:
        query = query.where(Contact.tags.ilike(f"%{tag}%"))
    if status:
        query = query.where(Contact.status == status.lower())
    if search:
        query = query.where(
            (Contact.email.ilike(f"%{search}%")) | (Contact.name.ilike(f"%{search}%"))
        )

    result = await db.execute(query.order_by(Contact.id.desc()))
    return result.scalars().all()


@router.post(
    "/lists/{list_id}/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    list_id: int,
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    list_check = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id, ContactList.user_id == current_user.id
        )
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found.")

    email = contact_in.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address format.")

    # Enforce uniqueness per list
    existing = await db.execute(
        select(Contact).where(Contact.list_id == list_id, Contact.email == email)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contact '{email}' already exists in this list.",
        )

    new_contact = Contact(
        list_id=list_id,
        email=email,
        name=(contact_in.name or "").strip(),
        tags=(contact_in.tags or "").strip(),
        status=(contact_in.status or "active").strip().lower(),
        custom_fields=(contact_in.custom_fields or "{}").strip(),
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact


@router.delete("/lists/{list_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    list_id: int,
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a single contact from a list (verifies ownership via list ownership)."""
    list_check = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id, ContactList.user_id == current_user.id
        )
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found.")

    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.list_id == list_id)
    )
    contact = result.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    await db.delete(contact)
    await db.commit()


@router.patch("/lists/{list_id}/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    list_id: int,
    contact_id: int,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a single contact in a mailing list."""
    list_check = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id, ContactList.user_id == current_user.id
        )
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found.")

    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.list_id == list_id)
    )
    contact = result.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    if contact_in.email is not None:
        email = contact_in.email.strip().lower()
        if not is_valid_email(email):
            raise HTTPException(status_code=400, detail="Invalid email address format.")
        
        # Check uniqueness if email has changed
        if email != contact.email:
            existing = await db.execute(
                select(Contact).where(Contact.list_id == list_id, Contact.email == email)
            )
            if existing.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Contact '{email}' already exists in this list.",
                )
            contact.email = email

    if contact_in.name is not None:
        contact.name = contact_in.name.strip()
    
    if contact_in.tags is not None:
        contact.tags = contact_in.tags.strip()
        
    if contact_in.status is not None:
        status_val = contact_in.status.strip().lower()
        contact.status = status_val
        contact.is_unsubscribed = (status_val == "unsubscribed")

    if contact_in.custom_fields is not None:
        contact.custom_fields = contact_in.custom_fields.strip()

    await db.commit()
    await db.refresh(contact)
    return contact


# ─────────────────────── CSV Upload ───────────────────────

@router.post("/lists/{list_id}/upload-csv", response_model=CSVImportResponse)
async def upload_csv(
    list_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parses an uploaded CSV, auto-maps email/name columns, deduplicates,
    and bulk-imports contacts into the list.

    Security: enforces 5MB file size limit, csv-only content type, and 50k row cap.
    """
    # Ownership check
    list_check = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id, ContactList.user_id == current_user.id
        )
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found.")

    # File type validation
    if file.content_type and "csv" not in file.content_type.lower() and "text" not in file.content_type.lower():
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are accepted (text/csv content type).",
        )

    try:
        # Read file in chunks to prevent memory exhaustion (OOM)
        contents = bytearray()
        chunk_size = 1024 * 1024  # 1MB chunk size
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            contents.extend(chunk)
            if len(contents) > CSV_MAX_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"CSV file exceeds maximum size limit of 5MB.",
                )

        decoded = contents.decode("utf-8-sig")  # Strip BOM characters
        csv_file = io.StringIO(decoded)
        reader = csv.reader(csv_file)

        headers = next(reader, None)
        if not headers:
            raise HTTPException(status_code=400, detail="CSV file is empty or has no headers.")

        # Auto-map column headers
        email_idx = -1
        name_idx = -1
        custom_header_mappings = []
        for idx, h in enumerate(headers):
            h_clean = h.strip().lower()
            if "email" in h_clean or "mail" in h_clean:
                email_idx = idx
            elif "name" in h_clean or "first" in h_clean or "subscriber" in h_clean:
                name_idx = idx
            else:
                custom_header_mappings.append((h.strip(), idx))

        if email_idx == -1:
            raise HTTPException(
                status_code=400,
                detail="Could not find an 'email' column in the CSV headers.",
            )

        # Load existing emails in this list to deduplicate
        existing_emails_result = await db.execute(
            select(Contact.email).where(Contact.list_id == list_id)
        )
        existing_emails = {row[0].lower() for row in existing_emails_result}

        success_count = 0
        failed_count = 0
        skipped_count = 0
        errors: list[str] = []
        import json

        for row_num, row in enumerate(reader, start=2):
            if row_num > CSV_MAX_ROWS + 1:
                errors.append(f"Row limit of {CSV_MAX_ROWS:,} reached. Remaining rows skipped.")
                break

            if not row or len(row) <= email_idx:
                continue

            email = row[email_idx].strip().lower()

            if not email or not is_valid_email(email):
                failed_count += 1
                if len(errors) < 20:  # Cap error list size
                    errors.append(f"Row {row_num}: Invalid email '{email}'")
                continue

            if email in existing_emails:
                skipped_count += 1
                continue

            name = ""
            if name_idx != -1 and len(row) > name_idx:
                name = row[name_idx].strip()[:200]  # Cap name length

            custom_data = {}
            for h_name, h_idx in custom_header_mappings:
                if len(row) > h_idx:
                    custom_data[h_name] = row[h_idx].strip()

            contact = Contact(
                list_id=list_id,
                email=email,
                name=name,
                custom_fields=json.dumps(custom_data)
            )
            db.add(contact)
            existing_emails.add(email)  # Prevent duplicates within the same upload
            success_count += 1

        await db.commit()
        return CSVImportResponse(
            success_count=success_count,
            failed_count=failed_count,
            skipped_count=skipped_count,
            errors=errors,
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process CSV file: {str(e)}",
        )
