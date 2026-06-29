# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parent.spec.js >> Parent Panel Role-Based Verification >> TC-043: Parent Concerns & Complaints - File Concern
- Location: tests\parent.spec.js:88:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: Authentication failed for Parent with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "Back to Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img [ref=e7]
      - generic [ref=e10]: Back to Home
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img "Zuna" [ref=e14]
        - heading "Welcome Back" [level=1] [ref=e15]
        - paragraph [ref=e16]: Authenticate to access your Zuna Ecosystem.
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Email Address
            - generic [ref=e21]:
              - generic:
                - img
              - textbox "admin@college.edu" [ref=e22]: parent@testcollege.edu
          - generic [ref=e23]:
            - generic [ref=e24]:
              - generic [ref=e25]: Password
              - link "Forgot password?" [ref=e26] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e27]:
              - generic:
                - img
              - textbox "••••••••" [ref=e28]: ParentPassword123!
              - button [ref=e29]:
                - img [ref=e30]
          - button "Authenticating..." [disabled] [ref=e33]:
            - generic [ref=e35]:
              - img [ref=e36]
              - text: Authenticating...
        - generic [ref=e38]:
          - text: Need an account?
          - link "Create your environment" [ref=e39] [cursor=pointer]:
            - /url: /register
  - generic [ref=e43]:
    - img [ref=e45]
    - heading "Enterprise-Grade Security" [level=2] [ref=e48]
    - paragraph [ref=e49]: Zuna utilizes role-based cryptographic isolation to ensure that student, teacher, and administrative data remains absolutely secure.
```