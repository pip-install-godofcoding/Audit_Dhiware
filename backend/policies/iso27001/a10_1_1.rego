package iso27001.a10_1_1

default compliant = false

compliant {
    input.encryption_at_rest == true
    input.key_management != null
}
