# 🩸 Decentralized Donor Registry for Blood and Plasma

Welcome to a revolutionary Web3 solution for addressing global blood and plasma shortages! This project creates a decentralized registry on the Stacks blockchain where donors can register their availability, recipients (like hospitals or blood banks) can post real-time needs, and an automated matching system connects them. Donors are incentivized with reward tokens for successful donations, ensuring a more efficient and transparent system.

## ✨ Features

🩸 Donor registration with blood type, location, and health details  
🏥 Recipient registration for hospitals and blood centers  
📢 Post urgent donation needs with specifics (e.g., blood type, quantity, location)  
🤝 Real-time matching of donors to needs via smart contract logic  
💰 Reward tokens issued to donors upon verified donations  
🔒 Immutable tracking of donations for transparency and fraud prevention  
📊 Analytics for donation trends and supply chain insights  
🚫 Governance for community-driven updates and dispute resolution  

## 🛠 How It Works

This project leverages 8 smart contracts written in Clarity to handle various aspects of the donor ecosystem securely and efficiently. Here's a high-level overview:

**Smart Contracts Overview**

1. **DonorRegistry.clar**: Handles donor onboarding, storing profiles (blood type, location, contact hash) and availability status.  
2. **RecipientRegistry.clar**: Registers hospitals/blood banks, verifying their legitimacy and storing need-posting permissions.  
3. **NeedPosting.clar**: Allows recipients to post donation requests with details like required blood type, urgency level, and location radius.  
4. **MatchingEngine.clar**: Automates matching logic, querying registries to find suitable donors based on criteria (e.g., proximity, compatibility) and notifies via events.  
5. **RewardToken.clar**: A fungible token contract (similar to SIP-010) for minting and distributing rewards to donors.  
6. **DonationTracking.clar**: Records completed donations, linking donors to needs and updating statuses immutably.  
7. **VerificationOracle.clar**: Integrates with off-chain oracles to confirm real-world donations (e.g., via QR code scans or API proofs) before releasing rewards.  
8. **Governance.clar**: Enables token holders to vote on system parameters, like reward amounts or matching algorithms.  

**For Donors**

- Register your profile using DonorRegistry with your blood type (e.g., O+), location, and a hashed contact method.  
- Monitor active needs via the MatchingEngine.  
- When matched, confirm availability and complete the donation off-chain.  
- Submit proof to VerificationOracle for automatic reward token minting.  

Boom! You've helped save lives and earned tokens redeemable for perks like health checkups or donations to charity.

**For Recipients (Hospitals/Blood Banks)**

- Register and verify your entity using RecipientRegistry.  
- Post a need via NeedPosting, specifying requirements.  
- Get matched donors from MatchingEngine and coordinate off-chain.  
- Verify the donation to trigger rewards and close the need.  

**For Verifiers and Users**

- Query DonationTracking for transparent records of all transactions.  
- Use Governance to propose improvements, voted on by token holders.  

This setup solves real-world issues like donation mismatches, lack of incentives, and centralized database vulnerabilities by decentralizing the process on Stacks. Real-time aspects are handled through blockchain events and oracle integrations for off-chain confirmations. Start building by deploying these Clarity contracts on the Stacks testnet!