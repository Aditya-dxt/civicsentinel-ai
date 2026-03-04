import random
import uuid
from datetime import datetime

LOCATIONS = [
    "Lucknow",
    "Delhi",
    "Mumbai",
    "Bangalore",
]

ISSUES = [
    "Water Crisis",
    "Electricity Outage",
    "Healthcare Failure",
    "Corruption Complaint"
]

MESSAGES = [
    "Citizens are protesting about water supply.",
    "Power outage affecting several areas.",
    "Hospitals lack proper equipment.",
    "Local officials accused of corruption."
]


def generate_event():

    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "location": random.choice(LOCATIONS),
        "issue": random.choice(ISSUES),
        "text": random.choice(MESSAGES)
    }