import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

TEST_DB_PATH = "/tmp/test_shiftswap.db"
os.environ["DATABASE_PATH"] = TEST_DB_PATH
os.environ["SEED_PATH"] = str(Path(__file__).parent.parent.parent / "seed.json")

from app.main import app
from app.database import init_db, get_connection

@pytest.fixture(autouse=True)
def setup_test_db():
    # Force reset with seed data before each test
    os.environ["DATABASE_PATH"] = TEST_DB_PATH
    os.environ["SEED_PATH"] = str(Path(__file__).parent.parent.parent / "seed.json")
    init_db(force_reset=True)
    yield

client = TestClient(app)

def test_get_staff():
    response = client.get("/api/staff")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 7
    roles = {s["role"] for s in data}
    assert "STAFF" in roles
    assert "MANAGER" in roles

def test_get_shifts_with_user_eligibility():
    # Alice (staff-1) requesting shifts
    response = client.get("/api/shifts?user_id=staff-1")
    assert response.status_code == 200
    shifts = response.json()
    assert len(shifts) >= 15
    for s in shifts:
        assert "duration_hours" in s
        assert "eligibility" in s
        assert s["eligibility"] is not None

def test_post_listing_success_and_refusal():
    # Alice posts her unlisted shift shift-101
    post_res = client.post("/api/listings", json={
        "actor_id": "staff-1",
        "shift_id": "shift-101"
    })
    assert post_res.status_code == 200
    listing = post_res.json()
    assert listing["status"] == "OPEN"
    assert listing["shift_id"] == "shift-101"
    assert listing["poster_id"] == "staff-1"

    # Alice tries to post the same shift again -> refused
    dup_res = client.post("/api/listings", json={
        "actor_id": "staff-1",
        "shift_id": "shift-101"
    })
    assert dup_res.status_code == 400
    assert "already has an active listing" in dup_res.json()["detail"]

    # Bob tries to post Alice's shift -> refused
    not_owner_res = client.post("/api/listings", json={
        "actor_id": "staff-2",
        "shift_id": "shift-101"
    })
    assert not_owner_res.status_code == 403

def test_withdraw_listing():
    # Post shift-101 by Alice
    post_res = client.post("/api/listings", json={
        "actor_id": "staff-1",
        "shift_id": "shift-101"
    })
    listing_id = post_res.json()["id"]

    # Bob tries to withdraw Alice's listing -> refused
    bob_res = client.post(f"/api/listings/{listing_id}/withdraw", json={"actor_id": "staff-2"})
    assert bob_res.status_code == 403

    # Alice withdraws her listing -> succeeds
    alice_res = client.post(f"/api/listings/{listing_id}/withdraw", json={"actor_id": "staff-1"})
    assert alice_res.status_code == 200
    assert alice_res.json()["status"] == "WITHDRAWN"

def test_claim_and_unclaim_lifecycle():
    # In seed data, listing-1 is OPEN for shift-102 (Bob's shift, Oct 12 15:00-23:00, requires Pediatrics)
    # Alice (staff-1) tries to claim listing-1:
    # Alice lacks Pediatrics (Rule 2) and has shift-101 ending at 15:00 (Rule 4 gap is 0h 0m)
    alice_res = client.post("/api/listings/listing-1/claim", json={"actor_id": "staff-1"})
    assert alice_res.status_code == 400
    violations = alice_res.json()["detail"]["violations"]
    rule_numbers = [v["rule_number"] for v in violations]
    assert 2 in rule_numbers
    assert 4 in rule_numbers

    # Evan (staff-5) has Pediatrics and no conflicts with shift-102 -> succeeds!
    evan_res = client.post("/api/listings/listing-1/claim", json={"actor_id": "staff-5"})
    assert evan_res.status_code == 200
    assert evan_res.json()["status"] == "CLAIMED"
    assert evan_res.json()["claimed_by"] == "staff-5"

    # Alice now tries to claim it when already claimed -> "Listing is no longer available"
    claimed_res = client.post("/api/listings/listing-1/claim", json={"actor_id": "staff-1"})
    assert claimed_res.status_code == 400
    avail_viol = claimed_res.json()["detail"]["violations"]
    assert avail_viol[0]["message"] == "Listing is no longer available"

    # Evan unclaims it
    unclaim_res = client.post("/api/listings/listing-1/unclaim", json={"actor_id": "staff-5"})
    assert unclaim_res.status_code == 200
    assert unclaim_res.json()["status"] == "OPEN"
    assert unclaim_res.json()["claimed_by"] is None

def test_manager_approve_and_reject():
    # In seed.json, listing-2 is CLAIMED by Alice (staff-1) on shift-104 (Diana's shift, Oct 13 12:00-20:00, Triage)
    # Manager rejects it first to test reject
    mgr_rej = client.post("/api/listings/listing-2/reject", json={"actor_id": "mgr-1"})
    assert mgr_rej.status_code == 200
    assert mgr_rej.json()["status"] == "OPEN"
    assert mgr_rej.json()["claimed_by"] is None

    # Alice re-claims listing-2
    reclaim = client.post("/api/listings/listing-2/claim", json={"actor_id": "staff-1"})
    assert reclaim.status_code == 200
    assert reclaim.json()["status"] == "CLAIMED"

    # Non-manager (Alice) tries to approve -> refused
    non_mgr = client.post("/api/listings/listing-2/approve", json={"actor_id": "staff-1"})
    assert non_mgr.status_code == 403

    # Manager approves it
    mgr_app = client.post("/api/listings/listing-2/approve", json={"actor_id": "mgr-1"})
    assert mgr_app.status_code == 200
    assert mgr_app.json()["status"] == "APPROVED"

    # Verify shift reassignment in DB
    shifts_res = client.get("/api/shifts")
    s104 = [s for s in shifts_res.json() if s["id"] == "shift-104"][0]
    assert s104["assigned_to"] == "staff-1"

def test_manager_approval_revalidation_failure():
    # In seed data, listing-2 is CLAIMED by Alice on shift-104 (Oct 13 12:00-20:00)
    # Suppose before manager approves, another shift is directly assigned or overlaps Alice's time
    # Let's insert a conflicting shift directly for Alice on Oct 13 14:00-18:00
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO shifts (id, start, end, required_certification, assigned_to) VALUES (?, ?, ?, ?, ?)",
        ("shift-conflict", "2026-10-13T14:00", "2026-10-13T18:00", None, "staff-1")
    )
    conn.commit()
    conn.close()

    # Now manager attempts to approve listing-2
    res = client.post("/api/listings/listing-2/approve", json={"actor_id": "mgr-1"})
    assert res.status_code == 400
    assert "Approval refused: labour rules violated" in res.json()["detail"]["message"]
    violations = res.json()["detail"]["violations"]
    assert any(v["rule_number"] == 3 for v in violations)

    # Verify listing remains CLAIMED
    listings = client.get("/api/listings").json()
    l2 = [l for l in listings if l["id"] == "listing-2"][0]
    assert l2["status"] == "CLAIMED"

def test_action_history_logging():
    # Action history must reflect previous operations
    history_res = client.get("/api/history")
    assert history_res.status_code == 200
    items = history_res.json()
    assert len(items) > 0
    types = {item["action_type"] for item in items}
    assert "SEED" in types
