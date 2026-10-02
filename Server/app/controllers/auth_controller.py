from fastapi import Request, Response, status, Depends, HTTPException
from sqlalchemy import select
from app.db.db import get_db
from app.models.auth import Account, User
from app.schema.auth import UserCredentials, OAuthPayload, AuthResponse
from app.utils.tokens import verify_password, hash_password, create_access_token


async def login(payload: UserCredentials, db=Depends(get_db)):

    if not payload.email or not payload.password:
        print('Email and password are required')
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # REGISTER
    if not user:
        if payload.confirm_password != payload.password:
            print(payload.confirm_password != payload.password)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and confirm password do not match"
            )

        hashed_password = await hash_password(payload.password)

        try:

            new_user = User(
                name=payload.name,
                email=payload.email,
                hashed_password=hashed_password,
                is_active = True,
                is_verified = False
            )
            db.add(new_user)
            await db.flush()

            await db.commit()
            
            access_token = await create_access_token(email=new_user.email, id=new_user.id)

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create access token"
                )


            return {
                "message": "Registration successful",
                "access_token": access_token,
                "user": {
                    "id": new_user.id,
                    "name": new_user.name,
                    "email": new_user.email,
                    "is_active": new_user.is_active,
                    "is_verified": new_user.is_verified
                }
            }

        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error creating user: {str(e)}"
            )
    else:
        # LOGIN
        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid email or password"
            )

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid email or password"
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is deactivated")

        access_token = await create_access_token(email=user.email, id=user.id)

        if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create access token"
                    )
    
    
        return {
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "is_active": user.is_active,
                "is_verified": user.is_verified
            }
        }

async def oauth_login(payload: OAuthPayload, db=Depends(get_db)):
    if not payload.email or not payload.access_token or not payload.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All data required"
        )

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()


    if not user:
        user = User(
            email=payload.email,
            name=payload.name,
            image=payload.image,
            is_verified=True,
            is_active=True
        )
        db.add(user)
        await db.flush()

    acc_result = await db.execute(
        select(Account).where(
            Account.provider == "google",
            Account.provider_account_id == payload.provider_account_id
        )
    )

    account = acc_result.scalar_one_or_none()

    if not account:
        account = Account(
            user_id=user.id,
            provider="google",
            provider_account_id=payload.provider_account_id,
            access_token=payload.access_token,
            id_token=payload.id_token,
            expires_at=payload.expires_at,
        )
        db.add(account)
    else:
        account.access_token = payload.access_token
        account.id_token = payload.id_token
        account.expires_at = payload.expires_at

    await db.commit()
    await db.refresh(user)

    token = await create_access_token(user.email, user.id)

    return AuthResponse (
        id=str(user.id),
        email=user.email,
        name=user.name,
        image=user.image,
        access_token=token
    )