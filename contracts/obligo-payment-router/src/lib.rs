use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

const USDT_CONTRACT: &str = "usdt.tether-token.near";
const FT_TRANSFER_GAS: Gas = Gas::from_tgas(30);

/// A narrowly scoped router for autonomous USDT payouts.
///
/// The contract is deployed to oblig.near, so the USDT balance remains on
/// oblig.near. The worker's restricted FunctionCall key targets this account
/// and can invoke only `pay`. The router then performs the NEP-141 transfer
/// with the required 1 yoctoNEAR deposit.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {}

#[near]
impl Contract {
    #[init]
    pub fn init() -> Self {
        require!(env::current_account_id().as_str() == "oblig.near", "Deploy only to oblig.near");
        Self {}
    }

    /// Transfer USDT from oblig.near to a registered recipient.
    ///
    /// `#[private]` ensures predecessor_account_id == current_account_id,
    /// preventing arbitrary accounts from using the router. The worker key
    /// itself is additionally restricted on-chain to this method.
    #[private]
    pub fn pay(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) -> Promise {
        require!(amount.0 > 0, "Amount must be greater than zero");
        require!(env::attached_deposit() == NearToken::from_yoctonear(0), "Do not attach NEAR");

        let args = near_sdk::serde_json::json!({
            "receiver_id": receiver_id,
            "amount": amount.0.to_string(),
            "memo": memo.unwrap_or_else(|| "Obligo invoice payout".to_string()),
        });

        let token_contract: AccountId = USDT_CONTRACT.parse().expect("valid USDT contract account");
        Promise::new(token_contract).function_call(
            "ft_transfer".to_string(),
            args.to_string().into_bytes(),
            NearToken::from_yoctonear(1),
            FT_TRANSFER_GAS,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("oblig.near".parse().unwrap())
            .predecessor_account_id(predecessor.clone())
            .signer_account_id(predecessor);
        builder
    }

    #[test]
    fn init_and_pay_from_self() {
        let mut ctx = context("oblig.near".parse().unwrap());
        testing_env!(ctx.build());
        let mut contract = Contract::init();

        ctx = context("oblig.near".parse().unwrap());
        testing_env!(ctx.build());
        let promise = contract.pay(accounts(1), U128(200_000), Some("invoice".to_string()));
        assert_eq!(promise.promise_index(), 0);
    }

    #[test]
    #[should_panic(expected = "Contract method is private")]
    fn rejects_external_caller() {
        let mut ctx = context("oblig.near".parse().unwrap());
        testing_env!(ctx.build());
        let mut contract = Contract::init();

        ctx = context(accounts(1));
        testing_env!(ctx.build());
        let _ = contract.pay(accounts(2), U128(200_000), None);
    }
}
