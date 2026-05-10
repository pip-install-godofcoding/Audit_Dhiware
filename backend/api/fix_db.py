import asyncio
from database import async_session_maker
from models import User
from sqlalchemy import select

async def main():
    async with async_session_maker() as session:
        # Get users
        query = select(User).where(User.email.in_(['admin@dhiware.com', 'auditor@dhiware.com']))
        result = await session.execute(query)
        users = result.scalars().all()
        
        for user in users:
            # Hash for 'admin123'
            user.password_hash = '$2b$12$32OY/aDtKtlDsJBQccB/UeBU16EA8644Qywx4lL8Aenqdmztz5iwy'
            
        await session.commit()
        print("Updated password hashes!")

if __name__ == "__main__":
    asyncio.run(main())
