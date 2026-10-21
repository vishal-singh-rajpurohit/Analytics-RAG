import os
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.models.auth import User
from app.controllers import auth_controller
from app.controllers.analysis_controller import (
    handle_upload,
    handle_get_analysis,
    handle_delete_analysis,
    handle_list_datasets,
    handle_preview,
    handle_query
)
from app.schema.analysis import QueryRequest
from fastapi import HTTPException, UploadFile

client = TestClient(app)

def test_unauthenticated_requests_fail_with_401():
    # 1. Test unauthenticated GET /datasets returns 401
    resp = client.get("/api/v1/analysis/datasets")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

    # 2. Test unauthenticated POST /upload returns 401
    csv_file = io.BytesIO(b"a,b\n1,2\n")
    resp = client.post("/api/v1/analysis/upload", files={"csv": ("test.csv", csv_file, "text/csv")})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

    # 3. Test unauthenticated GET /{analysis_id} returns 401
    resp = client.get(f"/api/v1/analysis/{uuid.uuid4()}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

    # 4. Test unauthenticated GET /{analysis_id}/preview returns 401
    resp = client.get(f"/api/v1/analysis/{uuid.uuid4()}/preview")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

    # 5. Test unauthenticated POST /query returns 401
    resp = client.post("/api/v1/analysis/query", json={"analysis_id": str(uuid.uuid4()), "query": "hello"})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

    # 6. Test unauthenticated DELETE /{analysis_id} returns 401
    resp = client.delete(f"/api/v1/analysis/{uuid.uuid4()}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"

def test_user_scoping_and_cross_user_isolation():
    import asyncio

    async def _test():
        user_a = User(id=uuid.uuid4(), email="usera@test.com", is_active=True)
        user_b = User(id=uuid.uuid4(), email="userb@test.com", is_active=True)

        # User A uploads dataset
        upload_a = UploadFile(filename="user_a_data.csv", file=io.BytesIO(b"col1,col2\n10,20\n30,40\n"))
        res_a = await handle_upload(csv=upload_a, current_user=user_a)
        analysis_id = res_a.analysis_id
        assert analysis_id is not None

        # User A can get metadata
        meta_a = await handle_get_analysis(analysis_id, current_user=user_a)
        assert meta_a["original_filename"] == "user_a_data.csv"

        # User A can preview
        preview_a = await handle_preview(analysis_id, current_user=user_a)
        assert preview_a.total_rows == 2

        # User A sees it in list_datasets
        datasets_a = await handle_list_datasets(current_user=user_a)
        assert any(d["analysis_id"] == analysis_id for d in datasets_a)

        # User B should NOT see User A's dataset in list_datasets
        datasets_b = await handle_list_datasets(current_user=user_b)
        assert not any(d["analysis_id"] == analysis_id for d in datasets_b)

        # User B should receive 403 Forbidden trying to access User A's analysis
        user_b_forbidden = False
        try:
            await handle_get_analysis(analysis_id, current_user=user_b)
        except HTTPException as exc:
            user_b_forbidden = True
            assert exc.status_code == 403
        assert user_b_forbidden, "User B accessing User A analysis must raise 403 Forbidden"

        # User B should receive 403 trying to preview User A's dataset
        user_b_preview_forbidden = False
        try:
            await handle_preview(analysis_id, current_user=user_b)
        except HTTPException as exc:
            user_b_preview_forbidden = True
            assert exc.status_code == 403
        assert user_b_preview_forbidden, "User B previewing User A dataset must raise 403 Forbidden"

        # User B should receive 403 trying to delete User A's dataset
        user_b_delete_forbidden = False
        try:
            await handle_delete_analysis(analysis_id, current_user=user_b)
        except HTTPException as exc:
            user_b_delete_forbidden = True
            assert exc.status_code == 403
        assert user_b_delete_forbidden, "User B deleting User A dataset must raise 403 Forbidden"

        # User A deletes their own dataset successfully
        del_res = await handle_delete_analysis(analysis_id, current_user=user_a)
        assert del_res["status"] == "success"

    asyncio.run(_test())


def test_credentials_auth_flows():
    import asyncio
    import httpx

    async def _run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"
            correct_password = "SecurePassword123!"

            # 1. Register new user
            reg_resp = await ac.post(
                "/api/v1/auth/login-credentials",
                json={
                    "email": unique_email,
                    "name": "Test Auth User",
                    "password": correct_password,
                    "confirm_password": correct_password,
                    "is_register": True,
                },
            )
            assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
            reg_data = reg_resp.json()
            assert reg_data["message"] == "Registration successful"
            assert "access_token" in reg_data
            assert reg_data["user"]["email"] == unique_email

            # 2. Login with correct password
            login_resp = await ac.post(
                "/api/v1/auth/login-credentials",
                json={
                    "email": unique_email,
                    "password": correct_password,
                },
            )
            assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
            login_data = login_resp.json()
            assert login_data["message"] == "Login successful"
            assert "access_token" in login_data

            # 3. Login with WRONG password must fail with 401
            wrong_resp = await ac.post(
                "/api/v1/auth/login-credentials",
                json={
                    "email": unique_email,
                    "password": "WrongPassword999!",
                },
            )
            assert wrong_resp.status_code == 401, f"Expected 401, got {wrong_resp.status_code}"
            assert "Invalid email or password" in wrong_resp.json()["detail"]

            # 4. Login with non-existent user must fail with 401
            ghost_resp = await ac.post(
                "/api/v1/auth/login-credentials",
                json={
                    "email": f"ghost_{uuid.uuid4().hex[:8]}@test.com",
                    "password": "SomePassword123!",
                },
            )
            assert ghost_resp.status_code == 401, f"Expected 401, got {ghost_resp.status_code}"
            assert "Invalid email or password" in ghost_resp.json()["detail"]

            # 5. Duplicate registration must fail with 400
            dup_resp = await ac.post(
                "/api/v1/auth/login-credentials",
                json={
                    "email": unique_email,
                    "name": "Duplicate User",
                    "password": "OtherPassword123!",
                    "confirm_password": "OtherPassword123!",
                    "is_register": True,
                },
            )
            assert dup_resp.status_code == 400, f"Expected 400, got {dup_resp.status_code}"
            assert "already exists" in dup_resp.json()["detail"]

    try:
        asyncio.run(_run())
    except (ConnectionRefusedError, OSError) as e:
        import pytest
        pytest.skip(f"PostgreSQL database not reachable locally ({e}); skipping live database auth integration test.")


if __name__ == "__main__":
    test_unauthenticated_requests_fail_with_401()
    test_user_scoping_and_cross_user_isolation()
    test_credentials_auth_flows()
    print("ALL AUTHENTICATION ENFORCEMENT & USER SCOPING TESTS PASSED!")
