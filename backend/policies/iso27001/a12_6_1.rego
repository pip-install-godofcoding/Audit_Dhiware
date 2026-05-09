package iso27001.a12_6_1

default compliant = false
default partial = false

compliant {
    input.last_scan_date != null
    days_since_scan < 30
}

partial {
    input.last_scan_date != null
    days_since_scan < 60
}

days_since_scan = days {
    scan := time.parse_rfc3339_ns(input.last_scan_date)
    now := time.now_ns()
    days := (now - scan) / (24 * 60 * 60 * 1000000000)
}
