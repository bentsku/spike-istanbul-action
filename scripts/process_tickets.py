from hubspot import HubSpot
from hubspot.crm.objects.notes import (
    SimplePublicObjectWithAssociations as NotesSimplePublicObjectWithAssociations,
)
import os
from datetime import datetime, timezone

api_client = HubSpot(access_token=os.environ.get("HUBSPOT_SECRET"))

def get_open_tickets_with_linked_prs():
    tickets = api_client.crm.tickets.get_all(properties=["test_property", "hs_pipeline_stage"], archived=False)
    return [ticket for ticket in tickets if ticket.properties.get("test_property") and ticket.properties.get("hs_pipeline_stage") != "4"]

def get_tickets_matching_prs(tickets, prs: list[str]):
    return [ticket for ticket in tickets if ticket.properties.get("test_property").rpartition("/")[2] in prs]

def notify_ticket(message: str, ticket_id: str) -> None:
    properties = {
        "hs_note_body": message,
        "hs_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    associations = [
        {
            "to": {"id": ticket_id},
            "types": [
                {
                    "associationCategory": "HUBSPOT_DEFINED",
                    "associationTypeId": "228",
                }
            ],
        }
    ]

    try:
        notes_with_associations = NotesSimplePublicObjectWithAssociations(
            properties=properties, associations=associations
        )
        note = api_client.crm.objects.notes.basic_api.create(
            simple_public_object_input_for_create=notes_with_associations
        )
        return note
    except Exception as e:
        raise Exception(
            f"Unexpected error occurred while syncing the message: {e}",
        )

if __name__ == "__main__":
    prs = os.environ.get("PR_NUMBERS")
    prs = prs.split(",")
    print(f"PRs: {prs}")
    tickets = get_open_tickets_with_linked_prs()
    tickets = get_tickets_matching_prs(tickets, prs)
    print(tickets)
    for ticket in tickets:
        notify_ticket("PR done", ticket.id)
