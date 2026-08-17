// use aiken/collection/dict
// // use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
// use cardano/assets.{PolicyId}
// use cardano/transaction.{Transaction}

// validator mint_achievement(backend_pkh: VerificationKeyHash) {
//   mint(_redeemer, policy_id: PolicyId, tx: Transaction) {
//     let backend_signed = must_be_signed_by(tx.extra_signatories, backend_pkh)

//     let valid_mint =
//       must_mint_exactly_one_nft(
//         tx.mint
//           |> assets.tokens(policy_id)
//           |> dict.to_pairs(),
//       )

//     backend_signed && valid_mint
//   }

//   else(_) {
//     False
//   }
// }

// fn must_be_signed_by(
//   signatories: List<VerificationKeyHash>,
//   signer: VerificationKeyHash,
// ) -> Bool {
//   list.has(signatories, signer)
// }

// fn must_mint_exactly_one_nft(minted_assets: List<Pair<ByteArray, Int>>) -> Bool {
//   when minted_assets is {
//     [Pair(asset_name, quantity)] -> asset_name != #"" && quantity == 1

//     _ -> False
//   }
// }

// test valid_mint() {
//   let assets =
//     [
//       Pair(
//         #"d9d4b2b228bdc219f9c09f7a92a53270a3ee96b9667f517fc560a07f120951d2",
//         1,
//       ),
//     ]

//   must_mint_exactly_one_nft(assets)
// }

// test empty_asset_name_is_invalid() {
//   let assets = [Pair(#"", 1)]

//   !must_mint_exactly_one_nft(assets)
// }

// test quantity_other_than_one_is_invalid() {
//   let assets =
//     [
//       Pair(
//         #"d9d4b2b228bdc219f9c09f7a92a53270a3ee96b9667f517fc560a07f120951d2",
//         2,
//       ),
//     ]

//   !must_mint_exactly_one_nft(assets)
// }

// test multiple_assets_are_invalid() {
//   let assets = [Pair(#"aaaa", 1), Pair(#"bbbb", 1)]

//   !must_mint_exactly_one_nft(assets)
// }

// test no_assets_are_invalid() {
//   let assets: List<Pair<ByteArray, Int>> = []

//   !must_mint_exactly_one_nft(assets)
// }

// test backend_signature_present() {
//   let backend: VerificationKeyHash =
//     #"970115f50af244eeae9091406d7a0f8016baf32cc56576c840801ead"

//   let signatories: List<VerificationKeyHash> = [backend]

//   must_be_signed_by(signatories, backend)
// }

// test backend_signature_missing() {
//   let backend: VerificationKeyHash =
//     #"970115f50af244eeae9091406d7a0f8016baf32cc56576c840801ead"

//   let other: VerificationKeyHash =
//     #"11111111111111111111111111111111111111111111111111111111"

//   let signatories: List<VerificationKeyHash> = [other]

//   !must_be_signed_by(signatories, backend)
// }
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

validator mint_achievement {
  mint(_redeemer, _policy_id: PolicyId, _tx: Transaction) {
    True
  }

  else(_) {
    fail
  }
}
