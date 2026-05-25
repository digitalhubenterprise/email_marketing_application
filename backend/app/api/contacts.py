import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import ContactList, Contact, User
from app.schemas.contact import (
    ContactListCreate, ContactListResponse,
    ContactCreate, ContactResponse, CSVImportResponse
)
from app.api.deps import get_current_user

router = APIRouter()

# ----------------- Contact Lists -----------------

@router.get("/lists", response_model=List[ContactListResponse])
async def list_contact_lists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch lists and count of contacts per list
    query = (
        select(ContactList, func.count(Contact.id).label("contacts_count"))
        .outerjoin(Contact, Contact.list_id == ContactList.id)
        .where(ContactList.user_id == current_user.id)
        .group_by(ContactList.id)
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
                contacts_count=count
            )
        )
    return lists

@router.post("/lists", response_model=ContactListResponse, status_code=status.HTTP_201_CREATED)
async def create_contact_list(
    list_in: ContactListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_list = ContactList(
        user_id=current_user.id,
        name=list_in.name,
        description=list_in.description
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    
    # Return response with 0 contacts
    return ContactListResponse(
        id=new_list.id,
        user_id=new_list.user_id,
        name=new_list.name,
        description=new_list.description,
        created_at=new_list.created_at,
        contacts_count=0
    )

@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ContactList).where(
            ContactList.id == list_id,
            ContactList.user_id == current_user.id
        )
    )
    contact_list = result.scalars().first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    await db.delete(contact_list)
    await db.commit()
    return

# ----------------- Individual Contacts -----------------

@router.get("/lists/{list_id}/contacts", response_model=List[ContactResponse])
async def list_contacts(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership of the list
    list_check = await db.execute(
        select(ContactList).where(ContactList.id == list_id, ContactList.user_id == current_user.id)
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found or unauthorized")
        
    result = await db.execute(
        select(Contact).where(Contact.list_id == list_id).order_by(Contact.id.desc())
    )
    return result.scalars().all()

@router.post("/lists/{list_id}/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    list_id: int,
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership of the list
    list_check = await db.execute(
        select(ContactList).where(ContactList.id == list_id, ContactList.user_id == current_user.id)
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found or unauthorized")
        
    new_contact = Contact(
        list_id=list_id,
        email=contact_in.email,
        name=contact_in.name,
        tags=contact_in.tags
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact

@router.post("/lists/{list_id}/upload-csv", response_model=CSVImportResponse)
async def upload_csv(
    list_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parses an uploaded CSV file, auto-maps columns, and imports contacts into the list."""
    # Verify ownership of the list
    list_check = await db.execute(
        select(ContactList).where(ContactList.id == list_id, ContactList.user_id == current_user.id)
    )
    if not list_check.scalars().first():
        raise HTTPException(status_code=404, detail="Mailing list not found or unauthorized")
        
    try:
        contents = await file.read()
        decoded = contents.decode("utf-8-sig")  # utf-8-sig strips BOM characters
        csv_file = io.StringIO(decoded)
        reader = csv.reader(csv_file)
        
        headers = next(reader, None)
        if not headers:
            raise HTTPException(status_code=400, detail="CSV file is empty")
            
        # Map headers to email and name
        email_idx = -1
        name_idx = -1
        
        for idx, h in enumerate(headers):
            h_clean = h.strip().lower()
            if "email" in h_clean or "mail" in h_clean:
                email_idx = idx
            elif "name" in h_clean or "first" in h_clean or "subscriber" in h_clean:
                name_idx = idx
                
        if email_idx == -1:
            raise HTTPException(
                status_code=400,
                detail="Could not find an 'email' column in the CSV file header."
            )
            
        success_count = 0
        failed_count = 0
        errors = []
        
        # Read and insert contacts
        for row_num, row in enumerate(reader, start=2):
            if not row or len(row) <= email_idx:
                continue
                
            email = row[email_idx].strip()
            if not email or "@" not in email:
                failed_count += 1
                errors.append(f"Row {row_num}: Invalid email '{email}'")
                continue
                
            name = row[name_idx].strip() if (name_idx != -1 and len(row) > name_idx) else ""
            
            # Create contact
            contact = Contact(
                list_id=list_id,
                email=email,
                name=name
            )
            db.add(contact)
            success_count += 1
            
        await db.commit()
        return CSVImportResponse(
            success_count=success_count,
            failed_count=failed_count,
            errors=errors
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process CSV file: {str(e)}"
        )
