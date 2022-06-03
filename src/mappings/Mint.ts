import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  nftClaimed,
  RedeemTokenSet
} from "../../generated/Mint/Mint"
import { NFT, Metadata, MintEvent, Token } from "../../generated/schema"
import { getTimeString } from "../helpers/datetime";
import { ERC20 } from "../../generated/MarketOffers/ERC20";
import { PhamNFTs } from "../../generated/Mint/PhamNFTs";

export function handlenftClaimed(event: nftClaimed): void {

  let mint = MintEvent.load(event.transaction.from.toHexString());
  if (!mint) {
    mint = new MintEvent(event.transaction.from.toHexString())
  }
  let date = getTimeString(event.block.timestamp);
  mint.date = date;
  mint.block = event.block.timestamp;

  mint.minter = event.params.creator.toHexString();
  mint.nftId = event.params.nftId;
  mint.value = event.transaction.value;
  let nftContract = PhamNFTs.bind(Address.fromString("0xd8b6bfEbB1F4FFBb73DbB07896295fAd3701E3Af"));

  let nft = NFT.load("0xd8b6bfEbB1F4FFBb73DbB07896295fAd3701E3Af" + event.params.nftId.toHex());
  if(!nft){
    nft = new NFT("0xd8b6bfEbB1F4FFBb73DbB07896295fAd3701E3Af" + event.params.nftId.toHex());
  }
  nft.contract_type = "ERC721";
  nft.token_address = nftContract._address;
  nft.token_id = event.params.nftId;
  nft.owner_of = event.params.creator;
  
  let metadata = Metadata.load("0xd8b6bfEbB1F4FFBb73DbB07896295fAd3701E3Af"+event.params.nftId.toHex());
  if(!metadata){
    metadata = new Metadata("0xd8b6bfEbB1F4FFBb73DbB07896295fAd3701E3Af"+event.params.nftId.toHex());
  }
  let uri = nftContract.try_tokenURI(event.params.nftId);
  if(!uri.reverted){
    metadata.uri = uri.value;
  }
  let name = nftContract.try_name();
  if(!name.reverted){
    metadata.name = name.value;
  }
  let symbol = nftContract.try_symbol();
  if(!symbol.reverted){
    metadata.symbol = symbol.value;
  }
  metadata.nft = nft.id;
  metadata.save();

  mint.save();
  nft.save();
}

export function handleRedeemTokenSet(event: RedeemTokenSet): void{
  let tokenId = event.params.contractAddress.toHexString();
  let token = Token.load(tokenId)
  token = new Token(tokenId);
  token.token_address = event.params.contractAddress;
  let contract = ERC20.bind(event.params.contractAddress);
  let name = contract.try_name();
  if(!name.reverted){
    token.name = name.value;
  }
  let symbol = contract.try_symbol();
  if(!symbol.reverted){
    token.symbol = symbol.value;
  }
  let decimals = contract.try_decimals();
  if(!decimals.reverted){
    token.decimals = BigInt.fromI32(decimals.value);
  }
  token.save();
} 