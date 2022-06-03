import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ItemBought,
  ItemDelisted,
  ItemListed,
  ItemUpdated
} from "../generated/NFTMarket/NFTMarket"
import { Stats, User, MarketItem, NFT, Swap, Metadata } from "../generated/schema"
import { ERC721 } from "../generated/NFTMarket/ERC721";
import { ERC1155 } from "../generated/NFTMarket/ERC1155";
import { getDateString, getTimeString } from './helpers/datetime';

export function handleItemListed(event: ItemListed): void {

  let listing_stats = Stats.load("listing_stats");
  
  if(!listing_stats){
    listing_stats = new Stats("listing_stats");
    listing_stats.count = BigInt.fromI32(0);
    listing_stats.type = "listings";
  }
  // BigInt and BigDecimal math are supported
  listing_stats.count = listing_stats.count.plus(BigInt.fromI32(1));

  let user_stats = Stats.load("user_stats");
  
  if(!user_stats){
    user_stats = new Stats("user_stats");
    user_stats.count = BigInt.fromI32(0);
    user_stats.type = "users";
  }
  let date = getTimeString(event.block.timestamp);
  let userAddress = event.params.seller.toHexString();
  let user = User.load(userAddress);
  if(!user){
    user = new User(userAddress);
    user_stats.count = user_stats.count.plus(BigInt.fromI32(1));
    user.block = event.block.timestamp;
    user.date = date;
  }
  listing_stats.save();
  user_stats.save();
  user.save();

  let itemId = userAddress.concat("_").concat(event.params.itemId.toHex());

  let marketItem = new MarketItem(itemId);
  marketItem.block = event.block.number;
  marketItem.date = date;
  marketItem.itemId = event.params.itemId;
  marketItem.active = true;
  marketItem.type = "listings";
  marketItem.amount1155 = event.params.amount1155;
  marketItem.price = event.params.price;
  marketItem.user = userAddress;
  
  let dataId = event.params.nftContract.toHexString().concat("_").concat(event.params.tokenId.toHex());
  if(event.params.amount1155 > BigInt.fromI32(0)){
    dataId = event.params.nftContract.toHexString().concat("_").concat(event.params.seller.toHexString());
  }

  let nft = NFT.load(dataId);
  if(!nft){
    nft = new NFT(dataId);
  }
  nft.token_address = event.params.nftContract;
  nft.token_id = event.params.tokenId;
  nft.owner_of = event.params.seller;
  if(event.params.amount1155 > BigInt.fromI32(0)){
    nft.contract_type = "ERC1155";
  } else {
    nft.contract_type = "ERC721";
  }
  marketItem.nft = dataId;
  marketItem.save();
  nft.save();
  
  if(event.params.amount1155 > BigInt.fromI32(0)){
    let nftContract = ERC1155.bind(event.params.nftContract);
    
    let metadata = Metadata.load(dataId);
    if(!metadata){
      metadata = new Metadata(dataId);
    }
    let uri = nftContract.try_uri(event.params.tokenId)
    if(!uri.reverted){
      metadata.uri = uri.value;
    }
    metadata.save();
  } else {
    let nftContract = ERC721.bind(event.params.nftContract);
    let metadata = Metadata.load(dataId);
    if(!metadata){
      metadata = new Metadata(dataId);
    }
    let uri = nftContract.try_tokenURI(event.params.tokenId);
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
    metadata.nft = dataId;
    metadata.save();
  }
}

export function handleItemBought(event: ItemBought): void {

  let sale_stats = Stats.load("sales_stats");
  
  if(!sale_stats){
    sale_stats = new Stats("sales_stats");
    sale_stats.count = BigInt.fromI32(0);
    sale_stats.type = "sales";
  }
  // BigInt and BigDecimal math are supported
  sale_stats.count = sale_stats.count.plus(BigInt.fromI32(1));
  sale_stats.save();
  let swap = new Swap(event.transaction.hash.toHex());
  let date = getTimeString(event.block.timestamp);
  swap.date = date;
  swap.block = event.block.timestamp;
  swap.type = "listed";
  let userAddress = event.params.fromAddress.toHexString();
  let user = User.load(userAddress);
  if(!user) {
    user = new User(userAddress);
  }
  swap.buyer = userAddress;
  let marketId = userAddress.concat("_").concat(event.params.itemId.toHex());
  let marketItem = MarketItem.load(marketId);
  if(!marketItem){
    marketItem = new MarketItem(marketId);
    marketItem.type = "listings";
  }
  marketItem.active = false;
  marketItem.save();

  swap.item = marketId;
  if(event.transaction.value > BigInt.fromI32(0)){
    swap.value = event.transaction.value;
  }
  swap.save();
  user.save();
}

export function handleItemDelisted(event: ItemDelisted): void {
  let marketId = event.transaction.from.toHexString().concat("_").concat(event.params.itemId.toHex());
  let marketItem = MarketItem.load(marketId);
  if(!marketItem){
    marketItem = new MarketItem(marketId);
    marketItem.type = "listings";
    marketItem.block = event.block.number;
    marketItem.date = getDateString(event.block.timestamp);
    marketItem.user = event.transaction.from.toHexString();
    marketItem.nft = event.params.nftContract.toHexString().concat(event.params.tokenId.toHex());
  }
  marketItem.active = false;
  marketItem.save();
}

export function handleItemUpdated(event: ItemUpdated): void {
  let marketId = event.transaction.from.toHexString().concat("_").concat(event.params.itemId.toHex());
  let marketItem = MarketItem.load(marketId);
  if(!marketItem){
    marketItem = new MarketItem(marketId);
    marketItem.type = "listings";
  }
  marketItem.price = event.params.price;
  marketItem.save();
}
