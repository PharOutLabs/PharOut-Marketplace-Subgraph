import { BigInt, ethereum, dataSource } from "@graphprotocol/graph-ts"
import {
  DaoClaimed,
  DevClaimed,
  NewDev,
  NewUser,
  RemovedDev,
  RewardsClaimed,
  SetTime,
  TokensReceived,
  SetUserCall
} from "../../generated/RewardsControl/RewardsControl"
import { RewardsToken, RewardsUser, ClaimClock, ClockCount, ClaimedRewards, Token, RewardsTokensSet, ClockTokens, RewardsTokenClaim } from "../../generated/schema"
import { getDateString, getTimeString, SECS_PER_DAY, SECS_PER_HOUR } from '../helpers/datetime';
import { getDaoRewards, getDevRewards, getDevStats, getEthStats, getRewardsDayData, getRewardsHourData, getToken, getTokenLength, getUserRewards, getUserStats } from "../helpers/services";

export function handleSetTime(event: SetTime): void {
  let time = event.block.timestamp;
  let date = getDateString(time);

  let clock = ClaimClock.load(date);

  if(!clock){
    clock = new ClaimClock(date);
  }
  let day = getRewardsDayData(time);
  if(day){
    
  }
  let count = ClockCount.load("CLOCK_COUNT");
  if(!count){
    count = new ClockCount('CLOCK_COUNT');
    count.count = BigInt.fromI32(0);
    count.epoch = BigInt.fromI32(0);
    count.aeons = BigInt.fromI32(0);
  }
  if(count.epoch = BigInt.fromI32(3)){
    count.aeons = count.aeons.plus(BigInt.fromI32(1));
    count.epoch = BigInt.fromI32(0);
  }
  count.count = count.count.plus(BigInt.fromI32(1));
  count.epoch = count.epoch.plus(BigInt.fromI32(1));
  count.save();

  clock.date = date;
  clock.aeon = day.aeon;
  clock.block = event.block.number;
  clock.alpha = event.params.alpha;
  clock.delta = event.params.delta;
  clock.omega = event.params.omega;
  clock.totalUsers = event.params.currentUserCount;
  let devs = getDevStats(event.address);
  if(!devs){
    devs = BigInt.fromI32(0);
  }
  clock.totalDevs = devs;
  clock.totalUsers = event.params.currentUserCount;
  let eth = getEthStats(event.address);
  if(!eth){
    eth = BigInt.fromI32(0);
  }
  clock.totalEther = eth;
  clock.tokenSet = "REWARDS_TOKENS_SET";
  clock.save();
}

export function handleNewDev(event: NewDev): void {
  let date = getDateString(event.block.timestamp);
  let devId = event.params.devAddress.toHexString();
  let dev = new RewardsUser(devId);
  dev.user = devId;
  let devs = getDevStats(event.address);
  if(!devs){
    devs = BigInt.fromI32(1);
  }
  dev.userId = devs;
  dev.type = "dev";
  dev.createdAt = date;
  dev.blockCreated = event.block.number;
  dev.kairos = event.block.timestamp;
  dev.epoch = BigInt.fromI32(0);
  dev.aeons = BigInt.fromI32(1);
  dev.active = true;
  dev.canClaim = true;
  dev.save();
}

export function handleRemovedDev(event: RemovedDev): void {
  let devId = event.params.devAddress.toHexString();
  let dev = RewardsUser.load(devId);
  if(!dev){
    dev = new RewardsUser(devId);
  }
  dev.epoch = BigInt.fromI32(0);
  dev.canClaim = false;
  dev.active = false;
  dev.save();
}

export function handleNewUser(event: NewUser): void {
  let date = getDateString(event.block.timestamp);
  let userId = event.params.userAddress.toHexString();
  let user = RewardsUser.load(userId);
  if(!user){
    user = new RewardsUser(userId);
    user.aeons = BigInt.fromI32(0);
    user.epoch = BigInt.fromI32(1);
  } else {
    user.aeons = user.aeons.plus(BigInt.fromI32(1));
  }
  user.userId = event.params.userId;
  user.user = userId;
  user.type = "user";
  user.createdAt = date;
  user.blockCreated = event.block.timestamp;
  user.kairos = event.block.timestamp;
  user.active = true;
  user.save();
}

export function handleSetUser(call: SetUserCall): void{
  let canClaim = call.inputs.canClaim;
  let userId = call.inputs.userAddress.toHexString();
  let user = RewardsUser.load(userId);
  if(!user){
    user = new RewardsUser(userId);
  } 
  user.canClaim = canClaim;
  if(!canClaim){
    user.kairos = BigInt.fromI32(0);
  }
  user.epoch = BigInt.fromI32(0);
  user.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let date = getDateString(event.block.timestamp);
  let userId = event.params.userAddress.toHexString();
  let rewards = new ClaimedRewards(userId.concat(date));
  let user = RewardsUser.load(userId);
  if(!user){
    user = new RewardsUser(userId);
    user.epoch = BigInt.fromI32(0);
  }
  user.epoch = user.epoch.plus(BigInt.fromI32(1));
  if(user.epoch === BigInt.fromI32(3)){
    user.canClaim = false;
    user.active = false;
    user.epoch = BigInt.fromI32(0);
  }
  rewards.user = userId;
  rewards.date = date;
  rewards.block = event.block.number;
  rewards.type = "user";
  rewards.eth = event.transaction.value;
  for(let i=0;i<event.params.contractAddress.length;i++){
    let token = new RewardsTokenClaim(userId.concat(event.block.timestamp.toHex()));
    token.token = event.params.contractAddress[i].toHexString();
    token.amount = event.params.erc20Amount[i];
    token.claim = userId.concat(date);
    token.save();

    let reToken = RewardsToken.load(event.params.contractAddress[i].toHexString());
    if(!reToken){
      reToken = new RewardsToken(event.params.contractAddress[i].toHexString());
    }
    reToken.amount = reToken.amount.minus(event.params.erc20Amount[i]);
    reToken.save();
  }
  rewards.save();
}

export function handleDevClaimed(event: DevClaimed): void {
  let date = getDateString(event.block.timestamp);
  let dev = event.params.devAddress.toHexString();
  let devId = dev.concat(date);
  let rewards = new ClaimedRewards(devId);

  let user = RewardsUser.load(dev);
  if(!user){
    user = new RewardsUser(dev);
    user.epoch = BigInt.fromI32(0);
  }
  user.epoch = user.epoch.plus(BigInt.fromI32(1));
  if(user.epoch === BigInt.fromI32(3)){
    user.epoch = BigInt.fromI32(0);
    user.aeons = user.aeons.plus(BigInt.fromI32(1));
  }
  user.save();

  rewards.user = event.params.devAddress.toHexString();
  rewards.date = date;
  rewards.block = event.block.number;
  rewards.type = "dev";
  rewards.eth = event.transaction.value;
  for(let i=0;i<event.params.contractAddress.length;i++){
    let token = new RewardsTokenClaim(devId.concat(event.block.timestamp.toHex()));
    token.token = event.params.contractAddress[i].toHexString();
    token.amount = event.params.erc20Amount[i];
    token.save();

    let reToken = RewardsToken.load(event.params.contractAddress[i].toHexString());
    if(!reToken){
      reToken = new RewardsToken(event.params.contractAddress[i].toHexString());
    }
    reToken.amount = reToken.amount.minus(event.params.erc20Amount[i]);
    reToken.save();
  }
  rewards.save();
}

export function handleDaoClaimed(event: DaoClaimed): void {
  let date = getDateString(event.block.timestamp);
  let daoId = event.params.daoAddress.toHexString();
  let dao = RewardsUser.load(daoId);
  if(!dao){
    dao = new RewardsUser(daoId);
    dao.epoch = BigInt.fromI32(0);
  }
  dao.epoch = dao.epoch.plus(BigInt.fromI32(1));
  if(dao.epoch === BigInt.fromI32(3)){
    dao.epoch = BigInt.fromI32(0);
    dao.aeons = dao.aeons.plus(BigInt.fromI32(1));
  }

  let claim = new ClaimedRewards(daoId.concat(date));

  claim.date = date;
  claim.type = "dao";
  claim.block = event.block.number;
  claim.eth = event.params.amount;
  
  let tokenAddress = event.params.contractAddress
  for(let i=0; i<tokenAddress.length; i = i + 1){
    let token = new RewardsTokenClaim(daoId.concat(event.block.timestamp.toHex()));
    token.token = event.params.contractAddress[i].toHexString();
    token.amount = event.params.erc20Amount[i];
    token.save();
    let reToken = RewardsToken.load(event.params.contractAddress[i].toHexString());
    if(!reToken){
      reToken = new RewardsToken(event.params.contractAddress[i].toHexString());
    }
    reToken.amount = reToken.amount.minus(event.params.erc20Amount[i]);
    reToken.save();
  }
  claim.save();
  dao.save();
}

export function handleTokensReceived(event: TokensReceived): void {
  let date = getDateString(event.block.timestamp);
  let time = getTimeString(event.block.timestamp);
  
  let tokenId = event.params.tokenAddress.toHexString();
  let rewardsToken = RewardsToken.load(tokenId);
  if(!rewardsToken){
    rewardsToken = new RewardsToken(tokenId);
    rewardsToken.amount = BigInt.fromI32(0);
    rewardsToken.token = tokenId;
  }
  rewardsToken.amount = rewardsToken.amount.plus(event.params.amount);
  rewardsToken.save();

  let token = Token.load(tokenId);
  if(!token){
    let contract = getToken(event.params.tokenAddress);
    token = new Token(tokenId);
    token.token_address = event.params.tokenAddress;
    token.name = contract.name;
    token.symbol = contract.symbol;
    token.decimals = contract.decimals;
    token.save();
  }
  let set = RewardsTokensSet.load("REWARDS_TOKENS_SET");
  if(!set){
    set = new RewardsTokensSet("REWARDS_TOKENS_SET");
  } else {
    let j = BigInt.fromI32(0);
    for(let i=0; BigInt.fromI32(i)<set.total; i = i + 1){
      if (set.tokens[i] !== tokenId) {
        set.tokens.push(tokenId);
        j =  j.plus(BigInt.fromI32(1));
      }
    }
    set.total = j;
  }
  set.dayData = date;
  set.hourData = time;
  set.save();
}

var ONE_DAY = BigInt.fromI32(SECS_PER_DAY);
var ONE_HOUR = BigInt.fromI32(SECS_PER_HOUR);

export function handleBlock(block: ethereum.Block): void {
  let count = ClockCount.load("CLOCK_COUNT");
  if(!count){
    count = new ClockCount('CLOCK_COUNT');
    count.count = BigInt.fromI32(0);
    count.epoch = BigInt.fromI32(0);
    count.aeons = BigInt.fromI32(0);
  }
  let time = getTimeString(block.timestamp);
  let day = getRewardsDayData(block.timestamp);
  let hour = getRewardsHourData(block.timestamp);

  let eth = getEthStats(dataSource.address());
  let users = getUserStats(dataSource.address());
  let tokens = getTokenLength(dataSource.address());
  let devs = getDevStats(dataSource.address());
  let set = RewardsTokensSet.load("REWARDS_TOKENS_SET");
  
  if(!set){
    set = new RewardsTokensSet("REWARDS_TOKENS_SET");
  } else {
    if(set.tokens && tokens > BigInt.fromI32(0)){
      for(let i=0; BigInt.fromI32(i)<tokens; i = i + 1){
        let token = RewardsToken.load(set.tokens[i]);
        let cTokens = new ClockTokens(set.tokens[i].concat(time));
        if(!token){
          token = new RewardsToken(set.tokens[i]);
          cTokens.token = set.tokens[i];
        }
        let alpha = getUserRewards(users, token.amount, "alpha");
        cTokens.alpha = alpha;
        let delta = getUserRewards(users, token.amount, "delta");
        cTokens.delta = delta;
        let omega = getUserRewards(users, token.amount, "omega");
        cTokens.omega = omega;
        let cDevs = getDevRewards(devs, token.amount);
        cTokens.dev = cDevs;
        let cDao = getDaoRewards(token.amount);
        cTokens.dao = cDao;
        cTokens.save();
      }
    }
  }
  set.total = tokens;
  let dateTime = getDateString(block.timestamp);
  let hourTime = getTimeString(block.timestamp);
  set.dayData = dateTime;
  set.hourData = hourTime;

  let alpha = getUserRewards(users, eth, "alpha");
  let delta = getUserRewards(users, eth, "delta");
  let omega = getUserRewards(users, eth, "omega");
  let devClaim = getDevRewards(devs, eth);
  let daoClaim = getDaoRewards(eth);
  day.aeon = count.aeons;
  day.totalUsers = users;
  day.totalEth = eth;
  day.totalTokens = tokens;
  day.totalDevs = devs;
  day.userClaimAlpha = alpha;
  day.userClaimDelta = delta;
  day.userClaimOmega = omega;
  day.devClaim = devClaim;
  day.daoClaim = daoClaim;

  hour.aeon = count.aeons;
  hour.totalUsers = users;
  hour.totalEth = eth;
  hour.totalTokens = tokens;
  hour.totalDevs = devs;
  hour.userClaimAlpha = alpha;
  hour.userClaimDelta = delta;
  hour.userClaimOmega = omega;
  hour.devClaim = devClaim;
  hour.daoClaim = daoClaim;
  
  set.save();
  day.save();
  hour.save();
}
