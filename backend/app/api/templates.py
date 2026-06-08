from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import EmailTemplate, User
from app.schemas.template import EmailTemplateCreate, EmailTemplateResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[EmailTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.user_id == current_user.id).order_by(EmailTemplate.id.desc())
    )
    return result.scalars().all()

from app.core.security import sanitize_html

@router.post("", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_in: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_template = EmailTemplate(
        user_id=current_user.id,
        name=template_in.name,
        subject=template_in.subject,
        content_html=sanitize_html(template_in.content_html)
    )
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template

@router.get("/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EmailTemplate).where(
            EmailTemplate.id == template_id,
            EmailTemplate.user_id == current_user.id
        )
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EmailTemplate).where(
            EmailTemplate.id == template_id,
            EmailTemplate.user_id == current_user.id
        )
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    await db.delete(template)
    await db.commit()
    return
