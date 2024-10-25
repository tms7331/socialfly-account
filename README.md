# Socialfly

Socialfly is a decentralized social networking application that allows users to store their encrypted data once and use it across multiple apps seamlessly. This project leverages Sign protocol and Lit protocol to create a secure foundation for social interactions while giving users control over their data.

Built for EthGlobal SF 2024.

Note: This repo was started from a fork of https://github.com/EthSign/lit-protocol-encrypt-frontend

## How It Works

Socialfly combines the strengths of two protocols:
- **Lit Protocol**: Used to encrypt user data and manage access controls.
- **Sign Protocol**: Used to store encrypted data and provide attestations to ensure that user data is linked to their account.

### Key Components

1. **Data Encryption & Storage**
   - User data is encrypted with Lit Protocol and stored via Sign Protocol.
   - Sign’s attestations ensure that the encrypted data is securely associated with the user’s account.
   - Data schemas and indexing within Sign allow for efficient querying and retrieval of data.

2. **Flexible Schema**
   - The data schema serves as an identifier for specific types of information (e.g., `profile_photo_001`, `bio_short`, `location`).
   - Data can be varied: from text and images to structured information like location coordinates.

3. **Access Controls**
   - Using Lit's access control, users can permit specific apps (referred to as Lit actions) to decrypt their data.
   - This access-based approach ensures data is only decrypted when authorized and needed, preserving privacy and user control.

### Example Apps

Two basic apps demonstrate Socialfly's functionality:

1. **Public Messageboard**
   - Users use their Socialfly profile to gain access to post on the messageboard.
   - While centralized, the app leverages user data from Socialfly, reducing friction for new users.

2. **Privacy-Preserving Matching App**
   - Users swipe through profiles and connect with people nearby.
   - Encrypted location data is decrypted within a Lit action, with the rest of the user profile decrypted only when users are close enough in proximity.
   - The app itself never has direct access to user data, ensuring privacy while enabling meaningful connections.

## Repositories

Socialfly comprises four separate repositories:

- [User Account Management](https://github.com/tms7331/socialfly-account): (This Repo) Handles the creation and management of user accounts.
- [Access Control Contracts](https://github.com/tms7331/socialfly-contracts): Manages access control using IPFS hashes.
- [Messageboard App](https://github.com/tms7331/socialfly-messageboard): Demonstrates a public messageboard using Socialfly's profile data.
- [Matching App](https://github.com/tms7331/socialfly-matching): Shows how privacy-preserving matchmaking works using encrypted user data.

## Getting Started

To get started, explore the repositories mentioned above to set up user accounts, manage access controls, or deploy the example apps.  Nextjs apps can be run locally with `npm install` and `npm run dev`.  An account with Lit testnet tokens is required to to use Lit.
