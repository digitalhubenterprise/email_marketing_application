import asyncio
import time
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.db.models import User, ContactList, Contact, Campaign, CampaignLog

async def simulate_load_performance():
    print("--- Simulating 1,000 Contacts & Campaign Log Load Performance ---")
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch test user
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalars().first()
        if not user:
            print("[-] Test failed: No user found in database to link mock data.")
            return
            
        print(f"[+] Found database user: {user.email}")
        
        # 2. Create a temporary Contact List
        print("[*] Creating a test Contact List...")
        contact_list = ContactList(
            user_id=user.id,
            name="1000 Contacts Performance List",
            description="Simulated list for load testing"
        )
        db.add(contact_list)
        await db.commit()
        await db.refresh(contact_list)
        
        # 3. Simulate inserting 1,000 contacts (bulk insert)
        print("[*] Performing bulk insert of 1,000 contacts...")
        start_time = time.time()
        
        mock_contacts = []
        for i in range(1000):
            mock_contacts.append(
                Contact(
                    list_id=contact_list.id,
                    email=f"recipient_{i}@performance-test.com",
                    name=f"Performance Recipient {i}",
                    status="active",
                    custom_fields="{}"
                )
            )
            
        db.add_all(mock_contacts)
        await db.commit()
        
        duration = time.time() - start_time
        print(f"[+] Successfully inserted 1,000 contacts in {duration:.4f} seconds.")
        
        # 4. Create a test campaign
        print("[*] Setting up mock Campaign...")
        campaign = Campaign(
            user_id=user.id,
            contact_list_id=contact_list.id,
            name="1000 Recipient Load Test Campaign",
            subject="Load Test Subject",
            content_html="<p>Load test template message body.</p>",
            smtp_server_id=1, # Mock SMTP link
            status="scheduled"
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        
        # 5. Simulate Campaign Logs dispatch preparation (1,000 logs)
        print("[*] Generating 1,000 Campaign Logs (Simulated delivery dispatcher)...")
        start_time = time.time()
        
        res_contacts = await db.execute(
            select(Contact).where(Contact.list_id == contact_list.id)
        )
        contacts = res_contacts.scalars().all()
        
        logs = []
        for contact in contacts:
            logs.append(
                CampaignLog(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    email=contact.email,
                    status="sent",
                    device_type="Desktop"
                )
            )
        db.add_all(logs)
        await db.commit()
        
        duration_logs = time.time() - start_time
        print(f"[+] Successfully generated 1,000 campaign logs in {duration_logs:.4f} seconds.")
        
        # 6. Verify count in database
        log_count_res = await db.execute(
            select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == campaign.id)
        )
        count = log_count_res.scalar()
        print(f"[+] Verified campaign log count: {count} entries.")
        
        # 7. Cleanup mock performance data
        print("[*] Cleaning up database mock data...")
        await db.delete(campaign)
        await db.delete(contact_list)
        await db.commit()
        print("[+] Cleanup complete. Database restored.")
        
        print("\n[SUCCESS] Performance test completed successfully!")

if __name__ == "__main__":
    asyncio.run(simulate_load_performance())
