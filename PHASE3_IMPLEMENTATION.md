# Phase 3 — Challenge Gating Implementation Summary

## Overview
Phase 3 — Challenge Gating has been successfully implemented. The system now enforces that users can only participate in challenges if their current wallet owns the required Badge/NFT assets.

## Architecture Implementation

### Domain Model
```
Reward (Badge definition)
  ↓ has policy_id + asset_name
Achievement (User earned badge)
  ↓ proof of earning, NOT ownership
NFT (On-chain asset)
  ↓ actual ownership
Challenge (Gated content)
  ↓ requires specific badges
ChallengeRequirement (Badge requirement)
  ↓ policy_id + asset_name + min_quantity
ChallengeParticipation (User participation)
  ↓ created only when eligibility passes
```

### Key Architecture Decisions
1. **Earned ≠ Owned**: Challenge eligibility is based on current on-chain ownership, not Achievement records
2. **Direct Blockchain Reference**: Requirements use `policy_id + asset_name` directly, not reward_id
3. **Authenticated Wallet**: Wallet address is obtained from authenticated user, not from client input
4. **Multiple Requirements**: Challenges can require multiple badges with ALL semantics
5. **Backend Enforcement**: Eligibility is enforced on backend, not just frontend

## Files Created/Modified

### 1. Challenge Entity & Types
**File**: `src/challenges/challenge.types.ts`

```typescript
export enum ChallengeStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum ChallengeParticipationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  status: ChallengeStatus;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChallengeRequirementRow = {
  id: string;
  challenge_id: string;
  policy_id: string;
  asset_name: string;
  min_quantity: string | number | bigint;
  created_at: string;
};

export type ChallengeEligibilityResponse = {
  challengeId: string;
  eligible: boolean;
  requirementMode: 'ALL';
  requirements: ChallengeRequirementEligibility[];
};

export type ChallengeParticipationRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ChallengeParticipationStatus;
  started_at: string;
  completed_at: string | null;
};
```

### 2. Challenge Service
**File**: `src/challenges/challenge.service.ts`

Key methods:
- `createChallenge()`: Creates new challenges
- `addRequirement()`: Adds badge requirements to challenges
- `checkChallengeEligibility()`: Checks if user owns required badges
- `startChallenge()`: Starts challenge only if eligible

**Eligibility Logic**:
```typescript
async checkChallengeEligibility(challengeId: string, userId: string) {
  // 1. Load challenge, requirements, and user wallet
  const [challenge, requirements, user] = await Promise.all([
    this.loadChallenge(challengeId),
    this.loadRequirements(challengeId),
    this.loadUserWallet(userId),
  ]);

  // 2. Check challenge is active
  this.assertChallengeActive(challenge);

  // 3. Check each requirement with caching
  const ownershipCache = new Map<string, Promise<OwnershipLookup>>();
  const evaluatedRequirements = await Promise.all(
    requirements.map(async (requirement) => {
      const cacheKey = `${requirement.policy_id}:${requirement.asset_name}`;
      let ownershipPromise = ownershipCache.get(cacheKey);

      if (!ownershipPromise) {
        ownershipPromise = this.cardanoService.checkAssetOwnership(
          user.wallet_address,
          requirement.policy_id,
          requirement.asset_name,
        );
        ownershipCache.set(cacheKey, ownershipPromise);
      }

      const ownership = await ownershipPromise;
      const satisfied = ownership.quantity >= BigInt(requirement.min_quantity);

      return { /* requirement details */ };
    }),
  );

  // 4. ALL requirements must be satisfied
  return {
    challengeId,
    eligible: evaluatedRequirements.every(req => req.satisfied),
    requirementMode: 'ALL',
    requirements: evaluatedRequirements,
  };
}
```

### 3. Challenge Controller
**File**: `src/challenges/challenge.controller.ts`

Endpoints:
- `POST /challenges` - Create challenge (Admin only)
- `POST /challenges/:challengeId/requirements` - Add requirement (Admin only)
- `GET /challenges/:challengeId/eligibility` - Check eligibility (Authenticated)
- `POST /challenges/:challengeId/start` - Start challenge (Authenticated)

### 4. DTOs
**Files**: 
- `src/challenges/dto/create-challenge.dto.ts`
- `src/challenges/dto/create-challenge-requirement.dto.ts`

### 5. Test Suites
**Files**:
- `src/challenges/challenge.service.spec.ts` (22 tests)
- `src/challenges/challenge.controller.spec.ts` (11 tests)

## Database Schema (Supabase)

### Tables Required

#### challenges
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### challenge_requirements
```sql
CREATE TABLE challenge_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  policy_id TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, policy_id, asset_name)
);
```

#### challenge_participations
```sql
CREATE TABLE challenge_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);
```

## API Endpoints

### 1. Create Challenge
```http
POST /challenges
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Cardano Advanced Quest",
  "description": "Advanced Cardano development challenge",
  "status": "ACTIVE",
  "startAt": "2026-08-20T00:00:00Z",
  "endAt": "2026-09-20T00:00:00Z"
}
```

### 2. Add Requirement
```http
POST /challenges/:challengeId/requirements
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policyId": "def683c5c5a4c7f8e9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "assetName": "17c09b0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
  "minQuantity": 1
}
```

### 3. Check Eligibility
```http
GET /challenges/:challengeId/eligibility
Authorization: Bearer <user_token>
```

**Response (Eligible)**:
```json
{
  "challengeId": "challenge-1",
  "eligible": true,
  "requirementMode": "ALL",
  "requirements": [
    {
      "id": "req-1",
      "policyId": "def683...",
      "assetName": "17c09b...",
      "minQuantity": "1",
      "owned": true,
      "quantity": "1",
      "assetUnit": "def683...17c09b...",
      "satisfied": true
    }
  ]
}
```

**Response (Not Eligible)**:
```json
{
  "challengeId": "challenge-1",
  "eligible": false,
  "requirementMode": "ALL",
  "requirements": [
    {
      "id": "req-1",
      "policyId": "def683...",
      "assetName": "17c09b...",
      "minQuantity": "1",
      "owned": false,
      "quantity": "0",
      "assetUnit": "def683...17c09b...",
      "satisfied": false
    }
  ]
}
```

### 4. Start Challenge
```http
POST /challenges/:challengeId/start
Authorization: Bearer <user_token>
```

**Response (Success)**:
```json
{
  "id": "participation-1",
  "challenge_id": "challenge-1",
  "user_id": "user-1",
  "status": "IN_PROGRESS",
  "started_at": "2026-08-20T10:00:00Z",
  "completed_at": null
}
```

**Response (Not Eligible)**:
```json
{
  "statusCode": 403,
  "message": "Missing required Badge/NFT",
  "error": "Forbidden",
  "eligibility": {
    "challengeId": "challenge-1",
    "eligible": false,
    "requirementMode": "ALL",
    "requirements": [...]
  }
}
```

## Example: Cardano Advanced Quest

### Setup
1. **Create the Challenge**:
```typescript
const challenge = await challengeService.createChallenge({
  title: 'Cardano Advanced Quest',
  description: 'Advanced Cardano development challenge requiring multiple badges',
  status: ChallengeStatus.ACTIVE,
  startAt: '2026-08-20T00:00:00Z',
  endAt: '2026-09-20T00:00:00Z',
});
```

2. **Add Requirements** (User needs all 3 badges):
```typescript
// Requirement 1: Cardano Beginner Badge
await challengeService.addRequirement(challenge.id, {
  policyId: 'def683c5c5a4c7f8e9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
  assetName: '17c09b0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
  minQuantity: 1,
});

// Requirement 2: Aiken Beginner Badge
await challengeService.addRequirement(challenge.id, {
  policyId: 'abc123def456...',
  assetName: 'deadbeef...',
  minQuantity: 1,
});

// Requirement 3: Networking Beginner Badge
await challengeService.addRequirement(challenge.id, {
  policyId: 'xyz789ghi012...',
  assetName: 'cafe1234...',
  minQuantity: 1,
});
```

### User Flow

#### Scenario 1: User Has All Badges (Eligible)
```typescript
// User's wallet owns all 3 required badges
const eligibility = await challengeService.checkChallengeEligibility(
  challenge.id,
  user.id
);

// Response:
{
  eligible: true,
  requirements: [
    { policyId: 'def683...', assetName: '17c09b...', owned: true, satisfied: true },
    { policyId: 'abc123...', assetName: 'deadbeef...', owned: true, satisfied: true },
    { policyId: 'xyz789...', assetName: 'cafe1234...', owned: true, satisfied: true }
  ]
}

// User can start challenge
const participation = await challengeService.startChallenge(challenge.id, user.id);
// Success: Creates participation record
```

#### Scenario 2: User Missing One Badge (Not Eligible)
```typescript
// User's wallet owns only 2 out of 3 badges
const eligibility = await challengeService.checkChallengeEligibility(
  challenge.id,
  user.id
);

// Response:
{
  eligible: false,
  requirements: [
    { policyId: 'def683...', assetName: '17c09b...', owned: true, satisfied: true },
    { policyId: 'abc123...', assetName: 'deadbeef...', owned: true, satisfied: true },
    { policyId: 'xyz789...', assetName: 'cafe1234...', owned: false, satisfied: false } // Missing
  ]
}

// User cannot start challenge
await challengeService.startChallenge(challenge.id, user.id);
// Error: ForbiddenException - "Missing required Badge/NFT"
```

#### Scenario 3: Earned But Transferred Away (Not Eligible)
```typescript
// User has Achievement.SUCCESS for all badges
// But transferred some badges to another wallet
const eligibility = await challengeService.checkChallengeEligibility(
  challenge.id,
  user.id
);

// Response:
{
  eligible: false,
  requirements: [
    { policyId: 'def683...', assetName: '17c09b...', owned: false, satisfied: false } // Transferred away
  ]
}

// Even though Achievement.SUCCESS = true, user is NOT eligible
```

#### Scenario 4: Never Earned But Received via Transfer (Eligible)
```typescript
// User has no Achievement records
// But received badges via transfer from another user
const eligibility = await challengeService.checkChallengeEligibility(
  challenge.id,
  user.id
);

// Response:
{
  eligible: true,
  requirements: [
    { policyId: 'def683...', assetName: '17c09b...', owned: true, satisfied: true }
  ]
}

// User IS eligible even though never earned the badges
```

## Test Coverage

### Unit Tests (33 total tests)

#### ChallengeService Tests (22 tests)
✅ Challenge Creation
- Create challenge with default DRAFT status
- Create challenge with custom status and dates

✅ Requirement Management
- Add requirement to challenge
- Throw NotFoundException if challenge doesn't exist

✅ Eligibility Checking
- Return eligible when user owns all requirements
- Return not eligible when missing one requirement
- Return not eligible when owns none of the requirements
- Be eligible when owns but never earned (earned != owned architecture)
- Be not eligible when earned but no longer owns (earned != owned architecture)
- Check min quantity correctly - satisfied
- Check min quantity correctly - not satisfied
- Reject when challenge is DRAFT
- Reject when challenge is CLOSED
- Reject when challenge has not started yet
- Reject when challenge has ended
- Be eligible when challenge has no requirements
- Cache ownership results for duplicate requirements
- Throw BadRequestException when user has no wallet address
- Throw NotFoundException when user not found

✅ Challenge Participation
- Allow starting challenge when eligible
- Block starting challenge when ineligible
- Throw ConflictException when challenge already started

#### ChallengeController Tests (11 tests)
✅ Controller Operations
- Create challenge
- Add requirement to challenge
- Check eligibility for authenticated user
- Return not eligible when missing requirements
- Handle multiple requirements correctly
- Start challenge when eligible
- Reject starting challenge when ineligible

✅ Authentication & Authorization
- Use JwtAuthGuard for eligibility check
- Use JwtAuthGuard for start challenge
- Use RolesGuard for create challenge
- Use RolesGuard for add requirement

## Key Acceptance Criteria Met

✅ **1. Challenge Entity**: Created with id, title, description, status, start_at, end_at, created_at, updated_at

✅ **2. ChallengeRequirement Entity**: Created with id, challenge_id, policy_id, asset_name, min_quantity, created_at

✅ **3. Direct Blockchain Reference**: Requirements use policy_id + asset_name directly, not reward_id

✅ **4. Multiple Requirements**: Challenges can have multiple badge requirements

✅ **5. ALL Requirements Semantics**: MVP implements ALL requirements (must satisfy all)

✅ **6. Authenticated User Wallet**: Wallet obtained from authenticated user, not client input

✅ **7. No Arbitrary Wallet Input**: Backend ignores any wallet address from client

✅ **8. CardanoService Integration**: Uses CardanoService.checkAssetOwnership() for blockchain queries

✅ **9. Earned ≠ Owned**: Achievement.SUCCESS does not determine eligibility

✅ **10. Current Ownership Required**: User must actually own required NFTs

✅ **11. Backend Enforcement**: POST /challenges/:id/start enforces eligibility check

✅ **12. Comprehensive Tests**: 33 tests covering positive/negative cases

✅ **13. Phase 1/2 Compatibility**: Does not affect existing mint flow and Phase 1/2 functionality

## Security Considerations

1. **Authentication Required**: All eligibility and start endpoints require JWT authentication
2. **Admin-Only Creation**: Challenge creation and requirement addition require admin role
3. **Wallet Security**: Wallet address obtained from authenticated user, preventing wallet spoofing
4. **Blockchain Verification**: Ownership verified on-chain via Blockfrost, not just database records
5. **Challenge Status Validation**: Only ACTIVE challenges can be checked for eligibility
6. **Time Window Enforcement**: Challenges respect start_at and end_at constraints
7. **Unique Participation**: Users can only start a challenge once (enforced by database constraint)

## Performance Optimizations

1. **Ownership Caching**: Duplicate requirements within same request only query blockchain once
2. **Parallel Queries**: Challenge, requirements, and user wallet loaded in parallel
3. **Efficient Database Queries**: Uses specific field selection to minimize data transfer
4. **No Persistent Ownership Table**: MVP uses real-time blockchain queries instead of caching

## Future Extensibility

The architecture is designed to support future enhancements:

1. **ANY Requirement Mode**: Easy to add OR semantics alongside ALL
2. **X of Y Requirements**: Can implement "need X out of Y requirements"
3. **Time-Based Requirements**: Can add temporal ownership requirements
4. **Conditional Requirements**: Can implement complex requirement logic
5. **Ownership Caching**: Can add persistent ownership table for performance
6. **Challenge Types**: Can extend to different challenge formats (quiz, hackathon, etc.)

## Integration Points

### CardanoService
- `checkAssetOwnership(address, policyId, assetName)` - Returns ownership details

### Database (Supabase)
- `challenges` table - Challenge definitions
- `challenge_requirements` table - Badge requirements
- `challenge_participations` table - User participation records
- `users` table - User wallet addresses

### Authentication
- `JwtAuthGuard` - Protects eligibility and start endpoints
- `@CurrentUser()` decorator - Provides authenticated user context
- `RolesGuard` - Protects admin-only operations

## Conclusion

Phase 3 — Challenge Gating has been successfully implemented with:

- ✅ Complete challenge and requirement management
- ✅ Real-time blockchain ownership verification
- ✅ Secure authenticated user handling
- ✅ Comprehensive test coverage (33 tests)
- ✅ Backend enforcement of eligibility rules
- ✅ Support for multiple badge requirements
- ✅ Clear separation between earned status and current ownership
- ✅ Extensible architecture for future enhancements

The implementation follows all acceptance criteria and maintains compatibility with existing Phase 1 and Phase 2 functionality.
