# Enclava

**Turn Data Into Value, Without Giving It Away**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.89+-orange.svg)](https://www.rust-lang.org)
[![Solidity](https://img.shields.io/badge/solidity-0.8.20+-green.svg)](https://soliditylang.org)
[![Sei](https://img.shields.io/badge/blockchain-Sei-purple.svg)](https://sei.io)

## Overview

Enclava is a decentralized AI-powered data marketplace designed to help individuals and organizations monetize their data without compromising privacy. Whether you want to sell, subscribe to, or rent data, Enclava offers a secure, seamless, and trustless environment, powered by Sei Blockchain.

Using **Trusted Execution Environments (TEE)**, sensitive data is processed confidentiall, raw data is never exposed. Privacy is preserved by design. Each dataset is represented by a personal AI Agent, which autonomously handles data exchange, queries, and payments with other agents.

On Enclava, your data becomes a valuable digital asset, a byproduct of your core business that you can monetize continuously through royalties. You can also query and analyze data within Enclava to gain powerful insights, detect patterns, and generate predictions and recommendations. The more data is shared, the more accurate and less biased AI systems become, unlocking innovation at scale.

## 🚀 Key Features

### 🔒 Privacy-First Architecture

- **Trusted Execution Environments (TEE)** - Process data without exposing raw information
- **Zero-Knowledge Proofs (ZKP)** - Prove data properties without revealing details
- **Homomorphic Encryption** - Compute on encrypted data while keeping it private
- **Data Watermarking & Provenance** - Track origin and prevent unauthorized usage

### 🤖 AI-Powered Intelligence

- **AI-driven data discovery & classification** - Smart labeling and organization
- **AI-powered data quality & cleansing** - Enforce integrity before processing
- **Natural Language Query** - Ask questions in plain language, get instant answers
- **Automatic relationship detection** - AI finds optimal dataset joins and merges
- **Synthetic data generation** - Fill missing pieces or augment datasets
- **Adaptive access control** - Context-aware permissions powered by AI

### 🔗 Blockchain Integration

- **NFT-based ownership** - Immutable proof of data rights
- **Smart contract automation** - Transparent, trustless transactions
- **Pay-per-query model** - Users only pay for data they use
- **Continuous royalties** - Data providers earn from every query
- **Sub-400ms finality** - Ultra-fast settlements via Sei Blockchain

### 🏗️ High-Performance Infrastructure

- **Rust-based backend** - Safe, fast, and memory-efficient processing
- **RESTful API** - Easy integration with existing systems
- **Swagger documentation** - Complete API reference
- **Scalable architecture** - Handle enterprise-grade workloads

## 🏛️ Architecture

### Backend (Rust)

```
backend/
├── src/
│   ├── api/           # REST API endpoints
│   ├── database/      # PostgreSQL integration
│   ├── tee/          # Trusted Execution Environment
│   ├── helpers/      # AI agents and utilities
│   ├── types/        # Data structures and schemas
│   └── config/       # Application configuration
├── migrations/       # Database migrations
└── uploads/         # Dataset storage
```

### Smart Contracts (Solidity)

```
contracts/
├── src/
│   └── EnclavaPayments.sol  # NFT-based payment system
├── script/                  # Deployment scripts
└── test/                   # Contract tests
```

## 🛠️ Technology Stack

- **Backend**: Rust with Actix-web framework
- **Database**: PostgreSQL with SQLx
- **AI/ML**: Google Gemini integration via Rig framework
- **Blockchain**: Solidity smart contracts on Sei Network
- **Development**: Foundry for smart contract development
- **API Documentation**: OpenAPI/Swagger with utoipa
- **File Processing**: CSV parsing and multipart uploads

## 📋 Prerequisites

- **Rust** 1.89+ ([Install Rust](https://rustup.rs/))
- **Node.js** 18+ ([Install Node.js](https://nodejs.org/))
- **PostgreSQL** 17+ ([Install PostgreSQL](https://postgresql.org/))
- **Foundry** ([Install Foundry](https://book.getfoundry.sh/getting-started/installation))
- **Git** ([Install Git](https://git-scm.com/))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/enclava.git
cd enclava
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost/enclava
ALCHEMY_RPC_URL=https://your-sei-rpc-url
GEMINI_API_KEY=your-gemini-api-key
PORT=8080
```

### 3. Database Setup

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli

# Create database and run migrations
cd backend
sqlx database create
sqlx migrate run
```

### 4. Backend Setup

```bash
cd backend
cargo build --release
cargo run
```

The API will be available at `http://localhost:8080`

- Swagger UI: `http://localhost:8080/swagger-ui/`
- Health check: `http://localhost:8080/health`

### 5. Smart Contract Setup

```bash
cd contracts

# Install dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Deploy to testnet (configure your private key first)
./deploy_testnet.sh
```

## 📚 API Documentation

### Core Endpoints

#### Health & Status

- `GET /` - Service status
- `GET /health` - Health check

#### Dataset Management

- `POST /dataset/upload` - Upload dataset with metadata
- `POST /dataset/details/generate` - AI-generated dataset details

#### AI Agents

- `GET /agents` - List all available agents
- `GET /agents/for-prompt` - Get agents suitable for a prompt
- `POST /agents/query` - Query specific agents
- `GET /agents/{id}` - Get agent details

#### Analytics

- `GET /datasets/stats` - Dataset statistics
- `GET /profile` - User profile information

### Example: Upload Dataset

```bash
curl -X POST "http://localhost:8080/dataset/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your-dataset.csv" \
  -F "user_address=0x1234567890123456789012345678901234567890" \
  -F "dataset_price=100.0" \
  -F "description=Sample dataset description" \
  -F "name=My Dataset" \
  -F "category=Analytics"
```

### Example: Query AI Agent

```bash
curl -X POST "http://localhost:8080/agents/query" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What insights can you provide about user behavior?",
    "agent_ids": [1, 2, 3],
    "tx_hash": "0xabcdef..."
  }'
```

## 🔐 Smart Contract Features

### EnclavaPayments Contract

The `EnclavaPayments.sol` contract implements:

- **ERC721 NFTs** representing dataset ownership
- **Royalty distribution** system for data providers
- **Payment tracking** and claim functionality
- **Usage-based billing** for data consumers

#### Key Functions

- `safeMint()` - Mint NFT for dataset upload
- `payForDatasetUsage()` - Process payments for data usage
- `claimAllFunds()` - Claim accumulated royalties
- `getUnclaimedAmount()` - Check pending earnings

## 🧪 Testing

### Backend Tests

```bash
cd backend
cargo test
```

### Smart Contract Tests

```bash
cd contracts
forge test -vvv
```

### Integration Tests

```bash
# Start the backend
cd backend && cargo run &

# Run integration tests
curl -X GET http://localhost:8080/health
```

## 🌐 Deployment

### Backend Deployment

```bash
# Build for production
cd backend
cargo build --release

# Run with production settings
RUST_LOG=info ./target/release/enclava_backend
```

### Smart Contract Deployment

```bash
cd contracts

# Deploy to Sei testnet with verification
./deploy_testnet.sh
```

## 🔧 Configuration

### Backend Configuration

Key configuration options in `backend/src/config.rs`:

- `DATABASE_URL` - PostgreSQL connection string
- `ALCHEMY_RPC_URL` - Blockchain RPC endpoint
- `PORT` - Server port (default: 8080)
- `UPLOAD_DIR` - Dataset storage directory
- `MAX_ALLOWED_SELECTED_AGENTS` - Query limit per request

### Smart Contract Configuration

- `ENCLAVA_CONTRACT_ADDRESS` - Address of the deployed EnclavaPayments contract
- Network configuration in `foundry.toml`
- `INITIAL_OWNER` - Address to receive contract ownership when deploying

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
