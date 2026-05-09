package iso27001.a9_2_5

default compliant = false
default partial = false

# COVERED: review date within 90 days and manager reviewed it
compliant {
    input.review_date != null
    days_since_review < 90
    input.reviewer_role == "manager"
}

partial {
    input.review_date != null
    days_since_review < 180
}

days_since_review = days {
    review := time.parse_rfc3339_ns(input.review_date)
    now := time.now_ns()
    days := (now - review) / (24 * 60 * 60 * 1000000000)
}
