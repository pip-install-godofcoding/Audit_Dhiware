"""
Hardcoded compliance framework control definitions.
Each control has: id, name, framework, domain, description.
"""


ISO_27001_CONTROLS = [
    {
        "id": "A.5.1.1",
        "name": "Policies for information security",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "A set of policies for information security shall be defined, approved by management, published and communicated to employees and relevant external parties.",
    },
    {
        "id": "A.6.1.1",
        "name": "Information security roles and responsibilities",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "All information security responsibilities shall be defined and allocated.",
    },
    {
        "id": "A.9.1.1",
        "name": "Access control policy",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "An access control policy shall be established, documented and reviewed based on business and information security requirements.",
    },
    {
        "id": "A.9.2.5",
        "name": "Review of user access rights",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "Asset owners shall review users' access rights at regular intervals. Reviews shall occur at least every 90 days for privileged accounts.",
    },
    {
        "id": "A.9.4.2",
        "name": "Secure log-on procedures",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "Where required by the access control policy, access to systems and applications shall be controlled by a secure log-on procedure including MFA.",
    },
    {
        "id": "A.10.1.1",
        "name": "Policy on the use of cryptographic controls",
        "framework": "iso27001",
        "domain": "cryptography",
        "description": "A policy on the use of cryptographic controls for protection of information shall be developed and implemented. Encryption at rest required for PII.",
    },
    {
        "id": "A.12.6.1",
        "name": "Management of technical vulnerabilities",
        "framework": "iso27001",
        "domain": "vulnerability_mgmt",
        "description": "Information about technical vulnerabilities of information systems being used shall be obtained in a timely fashion. Scans required monthly.",
    },
    {
        "id": "A.14.2.1",
        "name": "Secure development policy",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "Rules for the development of software and systems shall be established and applied to developments within the organisation.",
    },
    {
        "id": "A.16.1.1",
        "name": "Responsibilities and procedures for incident management",
        "framework": "iso27001",
        "domain": "incident_response",
        "description": "Management responsibilities and procedures shall be established to ensure a quick, effective, and orderly response to information security incidents.",
    },
    {
        "id": "A.17.1.1",
        "name": "Planning information security continuity",
        "framework": "iso27001",
        "domain": "business_continuity",
        "description": "The organisation shall determine its requirements for information security and the continuity of information security management. RTO and RPO must be documented.",
    },
    {
        "id": "A.18.1.1",
        "name": "Identification of applicable legislation and contractual requirements",
        "framework": "iso27001",
        "domain": "compliance",
        "description": "All relevant legislative statutory, regulatory, contractual requirements and the organisation's approach to meet these requirements shall be explicitly identified.",
    },
    {
        "id": "A.13.2.1",
        "name": "Information transfer policies and procedures",
        "framework": "iso27001",
        "domain": "access_control",
        "description": "Formal transfer policies, procedures and controls shall be in place to protect the transfer of information through the use of all types of communication facilities.",
    },
]

SOC2_CONTROLS = [
    {
        "id": "CC6.1",
        "name": "Logical access security",
        "framework": "soc2",
        "domain": "access_control",
        "description": "Logical access security software, infrastructure, and architectures have been implemented to protect against threats from sources outside its system boundaries.",
    },
    {
        "id": "CC6.3",
        "name": "Access removal",
        "framework": "soc2",
        "domain": "access_control",
        "description": "The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles, responsibilities, or the system design.",
    },
    {
        "id": "CC7.2",
        "name": "Vulnerability monitoring",
        "framework": "soc2",
        "domain": "vulnerability_mgmt",
        "description": "The entity monitors the effectiveness of controls, including those related to the identification of vulnerabilities and threats.",
    },
    {
        "id": "CC9.2",
        "name": "Vendor and business partner risk",
        "framework": "soc2",
        "domain": "vendor_risk",
        "description": "The entity assesses and manages risks associated with vendors and business partners.",
    },
    {
        "id": "A1.2",
        "name": "Availability - environmental protections",
        "framework": "soc2",
        "domain": "business_continuity",
        "description": "The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections.",
    },
]

NIST_CONTROLS = [
    {
        "id": "PR.AC-1",
        "name": "Identity and credential management",
        "framework": "nist",
        "domain": "access_control",
        "description": "Identities and credentials are issued, managed, verified, revoked, and audited for authorized devices, users, and processes.",
    },
    {
        "id": "PR.AC-4",
        "name": "Access permissions and authorizations",
        "framework": "nist",
        "domain": "access_control",
        "description": "Access permissions and authorizations are managed, incorporating the principles of least privilege and separation of duties.",
    },
    {
        "id": "PR.DS-1",
        "name": "Data-at-rest protection",
        "framework": "nist",
        "domain": "cryptography",
        "description": "Data-at-rest is protected.",
    },
    {
        "id": "RS.RP-1",
        "name": "Response plan",
        "framework": "nist",
        "domain": "incident_response",
        "description": "A response plan is executed during or after a cybersecurity incident.",
    },
    {
        "id": "RC.RP-1",
        "name": "Recovery plan",
        "framework": "nist",
        "domain": "business_continuity",
        "description": "A recovery plan is executed during or after a cybersecurity incident or adverse situation.",
    },
    {
        "id": "DE.CM-8",
        "name": "Vulnerability scans",
        "framework": "nist",
        "domain": "vulnerability_mgmt",
        "description": "Vulnerability scans are performed.",
    },
]

ALL_CONTROLS = {
    "iso27001": ISO_27001_CONTROLS,
    "soc2": SOC2_CONTROLS,
    "nist": NIST_CONTROLS,
}


def get_controls_for_frameworks(frameworks: list[str]) -> list[dict]:
    """Return all controls for the given framework keys."""
    controls = []
    for fw in frameworks:
        controls.extend(ALL_CONTROLS.get(fw, []))
    return controls
