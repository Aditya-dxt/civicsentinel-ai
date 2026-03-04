import pathway as pw
import random
from datetime import datetime

from app.streaming.pathway_pipeline import build_pipeline, CivicEvent


def run_pathway():

    events = pw.demo.generate_custom_stream(
    schema=CivicEvent,
    value_generators={
        "event_id": lambda i: str(random.randint(1000, 9999)),
        "timestamp": lambda i: str(datetime.now()),
        "location": lambda i: random.choice(["Delhi", "Mumbai", "Bangalore", "Lucknow"]),
        "issue": lambda i: random.choice([
            "Water Crisis",
            "Electricity Outage",
            "Corruption Complaint",
            "Healthcare Failure"
        ]),
        "text": lambda i: random.choice([
            "Citizens are protesting water supply",
            "Hospital services are failing",
            "Power outage reported across districts",
            "Officials accused of corruption"
        ]),
    },
)

    processed = build_pipeline(events)

    pw.debug.compute_and_print(processed, include_id=False)

    pw.run()


if __name__ == "__main__":
    run_pathway()