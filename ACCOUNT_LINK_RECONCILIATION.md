# Approved account-link reconciliation

Use this process only from Krish's authenticated **Admin Mode**. It is for a
conflict in which an existing tracker member has a different stored email or a
Firebase UID that cannot be proven to belong to the approved Google account.

1. Confirm the person can sign in to the approved Google email. Do not request,
   copy, store, or paste an ID token, access token, password, or private key.
2. Compare the tracker member ID and name with `approved-member-mapping.js`.
   Do not merge records and do not create a replacement member.
3. Inspect the current email and UID-link status in the Members management
   screen. If either belongs to another member, stop and investigate that
   separate conflict first.
4. For the intended existing member only, use **Update sign-in email** to set
   the configured approved email. This is an explicit admin action; it cannot
   be performed by a member request or a frontend-supplied member ID.
5. Have the person complete Google sign-in again. If the server reports a UID
   conflict, Krish must verify the ownership out of band, then use **Update
   Google link** for that same member ID. This invalidates older member
   sessions by advancing the link session version.
6. Confirm a fresh Member Mode login resolves to the original member ID and
   that Admin Mode is still available only through Krish's admin credentials.

For Kartik Kumar, the current record is `member_mvggbpb5y8e3h9`; its stored
email is `kk@gmail.com`, while the approved email is
`2k25cse2513784@gmail.com`. Its existing UID-only link must not be assumed to
belong to the approved account. Follow the process above; do not overwrite it
automatically.
