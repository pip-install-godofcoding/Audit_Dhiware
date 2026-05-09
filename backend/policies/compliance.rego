# Compliance Policy — ISO 27001 basic rules
#
# This is a placeholder Rego policy for OPA.
# Extend this with real compliance rules per framework.

package compliance.iso27001

default allow = false

allow {
    input.control_status == "covered"
}

deny[msg] {
    input.control_status == "gap"
    msg := sprintf("Control %s has a gap finding", [input.control_id])
}

risk_level = "high" {
    input.severity == "high"
    input.confidence > 0.8
}

risk_level = "medium" {
    input.severity == "medium"
}

risk_level = "low" {
    input.severity == "low"
}
