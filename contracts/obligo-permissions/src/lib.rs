use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, require, AccountId, PanicOnDefault};
use std::collections::HashMap;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct OnChainAuthorisation {
    pub id: String,
    pub user_account: AccountId,
    pub permission_hash: String,
    pub action_type: String,
    pub spending_limit: U128,
    pub currency: String,
    pub expiry: u64,
    pub revoked: bool,
    pub created_at: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct ObligoPermissionsContract {
    pub permissions: HashMap<String, OnChainAuthorisation>,
    pub permission_count: u64,
}

#[near_bindgen]
impl ObligoPermissionsContract {
    #[init]
    pub fn new() -> Self {
        require!(!env::state_exists(), "Already initialized");
        Self {
            permissions: HashMap::new(),
            permission_count: 0,
        }
    }

    /// Record a cryptographic permission hash with an explicit spending limit and expiration
    pub fn create_permission(
        &mut self,
        permission_hash: String,
        action_type: String,
        spending_limit: U128,
        currency: String,
        expiry: u64,
    ) -> String {
        let caller = env::predecessor_account_id();
        self.permission_count += 1;
        let permission_id = format!("perm_{}_{}", caller, self.permission_count);

        let record = OnChainAuthorisation {
            id: permission_id.clone(),
            user_account: caller,
            permission_hash,
            action_type,
            spending_limit,
            currency,
            expiry,
            revoked: false,
            created_at: env::block_timestamp(),
        };

        self.permissions.insert(permission_id.clone(), record);
        env::log_str(&format!("Permission created: {}", permission_id));
        permission_id
    }

    /// Revoke an existing permission. Only the original creator can revoke it.
    pub fn revoke_permission(&mut self, permission_id: String) -> bool {
        let caller = env::predecessor_account_id();
        let perm = self.permissions.get_mut(&permission_id);

        require!(perm.is_some(), "Permission not found");
        let record = perm.unwrap();

        require!(
            record.user_account == caller,
            "Only the permission owner can revoke this authorization"
        );

        record.revoked = true;
        env::log_str(&format!("Permission revoked: {}", permission_id));
        true
    }

    /// Retrieve permission details by ID
    pub fn get_permission(&self, permission_id: String) -> Option<OnChainAuthorisation> {
        self.permissions.get(&permission_id).cloned()
    }

    /// Verify if a permission hash is valid, unrevoked, and unexpired
    pub fn verify_permission(&self, permission_id: String) -> bool {
        if let Some(perm) = self.permissions.get(&permission_id) {
            let now = env::block_timestamp();
            !perm.revoked && perm.expiry > now
        } else {
            false
        }
    }
}
