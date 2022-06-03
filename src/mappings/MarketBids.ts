import { BigInt } from "@graphprotocol/graph-ts"
import {
  BidAccepted,
  BidEntered,
  BidRefunded,
  BidWithdrawn,
  BlindBidAccepted,
  BlindBidWithdrawn,
  BlindBidentered,
} from "../../generated/MarketBids/MarketBids"
import { User, Stats, NFT, Bid, MarketItem } from "../../generated/schema"
import { getTimeString } from '../helpers/datetime';
/*~~~>
  tokenId: token_id of the NFT to be bid on;
  itemId: itemId for internal storage index in the Market Contract;
  bidValue: Value of the bid entered;
  seller: ownerOf NFT;
  <~~~*/
export function handleBidEntered(event: BidEntered): void {

  //Load in and update Stats
  let stats = Stats.load("bid_stats");
  if(!stats){
    stats = new Stats("bid_stats");
    stats.type = "bids"
    stats.count = BigInt.fromI32(0);
  }
  stats.type = "bids";
  stats.count = stats.count.plus(BigInt.fromI32(1));
  stats.save();
  
  let date = getTimeString(event.block.timestamp);
  // Load in Bid
  let bidId = event.params.bidder.toHexString().concat(event.params.bidId.toHex()).concat("_bids");
  let bid = new Bid(bidId);
  bid.type = "listed";
  bid.date = date;
  bid.block = event.block.timestamp;
  bid.item = event.params.seller.toHexString().concat("_").concat(event.params.itemId.toHex());
  bid.bidId = event.params.bidId;
  let userAddress = event.params.bidder.toHexString();
  let user = User.load(userAddress);
  if(!user){
    let user_stats = Stats.load("user_stats");
    if(!user_stats){
      user_stats = new Stats("user_stats");
      user_stats.count = BigInt.fromI32(0);
    }
    user = new User(userAddress);
    user_stats.count = user_stats.count.plus(BigInt.fromI32(1));
    user_stats.type = "users";
    user.block = event.block.timestamp;
    user.date = date;
    user_stats.save();
  }
  user.save();
  bid.bidder = userAddress;
  bid.value = event.params.bidValue;
  bid.isSpecific = true;
  bid.active = true;
  bid.accepted = false;
  bid.save();
}

/*
  event BlindBidAccepted(
    uint indexed tokenId,
    uint blindBidId,
    uint bidValue,
    address indexed bidder,
    address indexed seller
  );
*/
export function handleBidAccepted(event: BidAccepted): void {
  let bidId = event.params.bidder.toHexString().concat(event.params.bidId.toHex()).concat("_bids");
  let bid = Bid.load(bidId);
  if(!bid){
    bid = new Bid(bidId);
  }
  bid.active = false;
  bid.accepted = true;
  bid.save();
}

/*
  event BidWithdrawn(
    uint256 indexed tokenId, 
    uint indexed bidId,
    address indexed bidder
    );
*/
export function handleBidWithdrawn(event: BidWithdrawn): void {  
  let bidId = event.params.bidder.toHexString().concat(event.params.bidId.toHex()).concat("_bids");
  let bid = Bid.load(bidId);
  if(!bid){
    bid = new Bid(bidId);
  }
  bid.active = false;
  bid.accepted = false;
  bid.save();
}

/*
  event BlindBidentered (
    bool isSpecified,
    uint indexed tokenId,
    uint blindBidId,
    uint bidValue,
    uint amount1155,
    address indexed collectionBid,
    address indexed bidder
  );
*/
export function handleBlindBidentered(event: BlindBidentered): void {
  let stats = Stats.load("blindBid_stats");

  if(!stats){
    stats = new Stats("blindBid_stats");
    stats.count = BigInt.fromI32(0);
    stats.type = "blindBids"
  }
  stats.count = stats.count.plus(BigInt.fromI32(1));
  stats.save();
  let bidId = event.params.bidder.toHexString().concat(event.params.blindBidId.toHexString()).concat("_blindBids");
  let bid = new Bid(bidId);

  let date = getTimeString(event.block.timestamp);
  bid.type = "blind";
  bid.date = date;
  bid.block = event.block.timestamp;

  let userAddress = event.params.bidder.toHexString();
  let user = User.load(userAddress);
  if(!user){
    let user_stats = Stats.load("user_stats");
    if(!user_stats){
      user_stats = new Stats("user_stats");
      user_stats.count = BigInt.fromI32(0);
    }
    user = new User(userAddress);
    user_stats.count = user_stats.count.plus(BigInt.fromI32(1));
    user_stats.type = "users";
    user.block = event.block.timestamp;
    user.date = date;
    user_stats.save();
  }
  user.save();

  let marketItem = new MarketItem(bidId);
  marketItem.block = event.block.timestamp;
  marketItem.date = date;
  marketItem.itemId = event.params.blindBidId;
  marketItem.active = true;
  marketItem.type = "blindBids";
  marketItem.amount1155 = event.params.amount1155;

  let dataId = event.params.collectionBid.toHexString().concat("_").concat(event.params.tokenId.toHex());
  let nft = NFT.load(dataId);
  if(!nft){
    nft = new NFT(dataId);
  }
  nft.token_address = event.params.collectionBid;
  nft.token_id = event.params.tokenId;

  if(event.params.amount1155 > BigInt.fromI32(0)){
    nft.contract_type = "ERC1155";
  } else {
    nft.contract_type = "ERC721";
  }
  marketItem.nft = dataId;
  marketItem.save();
  nft.save();

  bid.item = bidId;
  bid.bidder = userAddress;
  bid.bidId = event.params.blindBidId;
  bid.value = event.params.bidValue;
  bid.isSpecific = true;
  bid.active = true;
  bid.accepted = false;
  bid.save();
}


/*
  event BlindBidAccepted(
    uint indexed tokenId,
    uint blindBidId,
    uint bidValue,
    address indexed bidder,
    address indexed seller
  );
*/
export function handleBlindBidAccepted(event: BlindBidAccepted): void {
  let bidId = event.params.bidder.toHexString().concat(event.params.blindBidId.toHex()).concat("_blindBids");
  let bid = Bid.load(bidId);
  if(!bid){
    bid = new Bid(bidId);
    bid.type = "blind";
  }
  bid.active = false;
  bid.accepted = true;
  bid.save();

  let marketItem = MarketItem.load(bidId);
  if(!marketItem){
    marketItem = new MarketItem(bidId);
  }
  marketItem.active = false;
  marketItem.save();
}

/*
  event BlindBidWithdrawn(
    uint indexed blindBidId,
    address indexed bidder
    );
*/
export function handleBlindBidWithdrawn(event: BlindBidWithdrawn): void {
  let bidId = event.params.bidder.toHexString().concat(event.params.blindBidId.toHex()).concat("_blindBids");
  let bid = Bid.load(bidId);
  if(!bid){
    bid = new Bid(bidId);
    bid.type = "blind";
  }
  bid.active = false;
  bid.accepted = false;
  bid.save();

  let marketItem = MarketItem.load(bidId);
  if(!marketItem){
    marketItem = new MarketItem(bidId);
  }
  marketItem.active = false;
  marketItem.save();
}

/*
  event BidRefunded(
    uint indexed tokenId,
    uint indexed bidId,
    address indexed bidder
  );
*/
export function handleBidRefunded(event: BidRefunded): void {
  let bidId = event.params.bidder.toHexString().concat(event.params.bidId.toHex()).concat("_bids");
  let bid = Bid.load(bidId);
  if(!bid){
    bid = new Bid(bidId);
  }
  bid.active = false;
  bid.accepted = false;
  bid.save();
}

