// use aiken/collection/list

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
