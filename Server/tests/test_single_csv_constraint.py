import os
import io
import asyncio
from fastapi import UploadFile, HTTPException
from app.controllers.analysis_controller import (
    handle_upload,
    handle_delete_analysis,
    handle_get_analysis,
    handle_preview,
    _load_session_meta
)


def _make_upload_file(filename: str, content: bytes) -> UploadFile:
    file_io = io.BytesIO(content)
    return UploadFile(filename=filename, file=file_io)


def test_single_csv_per_analysis_chat():
    async def _test():
        csv1_content = b"id,name,value\n1,Alice,100\n2,Bob,200\n"
        upload_file_1 = _make_upload_file("sales_data.csv", csv1_content)

        # 1. First upload creates a new analysis chat session
        res1 = await handle_upload(csv=upload_file_1)
        analysis_id = res1.analysis_id
        assert analysis_id is not None
        assert res1.filename == "sales_data.csv"
        assert res1.total_rows == 2

        meta = _load_session_meta(analysis_id)
        assert meta is not None
        assert meta["original_filename"] == "sales_data.csv"

        # 2. Attempting to upload a second CSV to the SAME analysis chat session MUST fail
        csv2_content = b"order_id,item,price\n101,Widget,50\n"
        upload_file_2 = _make_upload_file("orders_data.csv", csv2_content)

        failed_second_upload = False
        try:
            await handle_upload(csv=upload_file_2, analysis_id=analysis_id)
        except HTTPException as exc:
            failed_second_upload = True
            assert exc.status_code == 400
            assert "already has an uploaded dataset" in exc.detail
            assert "strictly limited to one CSV file" in exc.detail
        assert failed_second_upload, "Second CSV upload to same analysis_id should have raised HTTPException 400"

        # 3. Non-CSV file upload must be rejected
        txt_content = b"some random text"
        upload_txt = _make_upload_file("document.txt", txt_content)
        failed_txt = False
        try:
            await handle_upload(csv=upload_txt)
        except HTTPException as exc:
            failed_txt = True
            assert exc.status_code == 400
            assert "Only CSV files" in exc.detail
        assert failed_txt, "Non-CSV file should have raised HTTPException 400"

        # 4. Empty CSV file upload must be rejected
        upload_empty = _make_upload_file("empty.csv", b"")
        failed_empty = False
        try:
            await handle_upload(csv=upload_empty)
        except HTTPException as exc:
            failed_empty = True
            assert exc.status_code == 400
            assert "uploaded file is empty" in exc.detail
        assert failed_empty, "Empty CSV file should have raised HTTPException 400"

        # 5. Starting a NEW analysis chat session with another CSV must succeed independently
        upload_file_3 = _make_upload_file("new_chat_dataset.csv", b"x,y\n10,20\n30,40\n")
        res2 = await handle_upload(csv=upload_file_3)
        analysis_id_2 = res2.analysis_id
        assert analysis_id_2 != analysis_id
        assert res2.filename == "new_chat_dataset.csv"

        # 6. Deleting analysis session 1 cleans up files
        del_res = await handle_delete_analysis(analysis_id)
        assert del_res["status"] == "success"

        # Verify analysis 1 is gone
        failed_gone = False
        try:
            await handle_get_analysis(analysis_id)
        except HTTPException as exc_gone:
            failed_gone = True
            assert exc_gone.status_code == 404
        assert failed_gone, "Deleted analysis should have raised HTTPException 404"

        # Clean up second test analysis session
        await handle_delete_analysis(analysis_id_2)

    asyncio.run(_test())


if __name__ == "__main__":
    test_single_csv_per_analysis_chat()
    print("ALL SINGLE CSV CONSTRAINT TESTS PASSED!")
