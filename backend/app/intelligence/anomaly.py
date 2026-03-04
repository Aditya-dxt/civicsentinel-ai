issue_counter = {}

def detect_anomaly(issue):

    if issue not in issue_counter:
        issue_counter[issue] = 0

    issue_counter[issue] += 1

    if issue_counter[issue] > 5:
        return 1

    return 0