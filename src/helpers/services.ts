import {
    BigInt,
    Address,
  } from '@graphprotocol/graph-ts';
  import {
    Token,
    User,
    RewardsDayData,
    RewardsHourData,
    ClaimClock,
  } from '../../generated/schema';
  import { ERC20 } from '../../generated/ERC20';
  import { getDateString, getHour, getTimeString, SECS_PER_DAY } from './datetime';
import { RewardsControl } from '../../generated/RewardsControl/RewardsControl';

  export function getToken(tokenAddress: Address): Token {
    let token = Token.load(tokenAddress.toHexString());
    if (!token) {
      token = new Token(tokenAddress.toHexString());
    }
    let erc20 = ERC20.bind(tokenAddress);
    let symbol = erc20.try_symbol();
    let name = erc20.try_name();
  
    token.symbol = symbol.reverted ? '' : symbol.value;
    token.name = name.reverted ? '' : name.value;
    return token as Token;
  }

  export function getTokenLength(rewardsAddress: Address): BigInt{
    let contract = RewardsControl.bind(rewardsAddress);
    let tokens = contract.try_fetchRewardTokens();
    let len = tokens.reverted ? BigInt.fromI32(0) : BigInt.fromI32(tokens.value.length);
    return len;
  }

  export function getEthStats(rewardsAddress: Address): BigInt{
    let contract = RewardsControl.bind(rewardsAddress);
    let eth = contract.try_fetchEthAmount();
    let token = eth.reverted ? BigInt.fromI32(0) : eth.value;
    return token;
  }

  export function getUserStats(rewardsAddress: Address): BigInt{
    let contract = RewardsControl.bind(rewardsAddress);
    let users = contract.try_fetchUserAmnt();
    let amount = users.reverted ? BigInt.fromI32(0) : users.value;
    return amount;
  }

  export function getDevStats(rewardsAddress: Address): BigInt{
    let contract = RewardsControl.bind(rewardsAddress);
    let users = contract.try_fetchDevs();
    let amount = users.reverted ? BigInt.fromI32(0) : BigInt.fromI32(users.value.length);
    return amount;
  }

  export function getUserRewards(userAmount: BigInt, tokenAmount: BigInt, epoch: String): BigInt{
    if (tokenAmount.gt(BigInt.fromI32(0))){
      let div = (tokenAmount.div(BigInt.fromI32(3)));
      let amount = tokenAmount.minus(div);
      let total = BigInt.fromI32(0);
      if(epoch == "alpha"){
        total = (amount).div(userAmount);
      }
      if(epoch == "delta"){
        let users = amount.div(userAmount);
        total = users.div(BigInt.fromI32(2))
      }
      if(epoch == "omega"){
        let users = amount.div(userAmount);
        total = users.div(BigInt.fromI32(3))
      }
      return total;
    } else {
      return BigInt.fromI32(0)
    }
    
  }

  export function getDevRewards(userAmount: BigInt, tokenAmount: BigInt): BigInt{
    if (tokenAmount.gt(BigInt.fromI32(0))){
    let div = (tokenAmount.div(BigInt.fromI32(3)));
    let amount = div.div(BigInt.fromI32(4));
    let devAmount = amount.div(userAmount);
    return devAmount;
    } else {
      return BigInt.fromI32(0)
    }
  }

  export function getDaoRewards(tokenAmount: BigInt): BigInt{
    if (tokenAmount.gt(BigInt.fromI32(0))){
    let div = (tokenAmount.div(BigInt.fromI32(3)));
    let split = div.div(BigInt.fromI32(4));
    let amount = div.minus(split);
    return amount;
    } else {
      return BigInt.fromI32(0)
    }
  }

  export function getUser(userAddress: Address): User {
    let user = User.load(userAddress.toHexString());
    if (!user) {
      user = new User(userAddress.toHexString());
    }
    return user as User;
  }

  export function getRewardsUser(userAddress: Address): User {
    let user = User.load(userAddress.toHexString());
    if (!user) {
      user = new User(userAddress.toHexString());
    }
    return user as User;
  }

  var ONE_DAY = BigInt.fromI32(SECS_PER_DAY);
  
  export function getClock(date: BigInt): ClaimClock {
    let dateTime = getDateString(date);
    let clock = ClaimClock.load(dateTime);
    if(!clock){
        let yesterday = date.minus(ONE_DAY);
        let timeString = getDateString(yesterday);
        clock = ClaimClock.load(timeString);
       if(!clock) {
        let twoDays = ONE_DAY.plus(ONE_DAY);
        let twoDaysAgo = date.minus(twoDays);
        let timeString = getDateString(twoDaysAgo);
        clock = ClaimClock.load(timeString);
      }
    }
    return clock as ClaimClock;
  }
  
  export function getRewardsDayData(
    date: BigInt,
  ): RewardsDayData {
    let dateTime = getDateString(date)
    let rewardsDayData = RewardsDayData.load(dateTime);
    if (!rewardsDayData) {
      rewardsDayData = new RewardsDayData(dateTime);
      rewardsDayData.date = date;
      rewardsDayData.tokenSet = "REWARDS_TOKENS_SET";
      rewardsDayData.totalEth = BigInt.fromI32(0);
      rewardsDayData.totalTokens = BigInt.fromI32(0);
      rewardsDayData.totalUsers = BigInt.fromI32(0);
      rewardsDayData.totalNFTHolders = BigInt.fromI32(0);
      rewardsDayData.totalDevs = BigInt.fromI32(0);
      rewardsDayData.userClaimAlpha = BigInt.fromI32(0);
      rewardsDayData.userClaimDelta = BigInt.fromI32(0);
      rewardsDayData.userClaimOmega = BigInt.fromI32(0);
      rewardsDayData.devClaim = BigInt.fromI32(0);
      rewardsDayData.daoClaim = BigInt.fromI32(0);
    }
    return rewardsDayData as RewardsDayData;
  }
  
  export function getRewardsHourData(
    date: BigInt,
  ): RewardsHourData {
    let dateTime = getTimeString(date);
    let rewardsHourData = RewardsHourData.load(dateTime);
    if (!rewardsHourData) {
      rewardsHourData = new RewardsHourData(dateTime);
      rewardsHourData.date = date;
      rewardsHourData.tokenSet = "REWARDS_TOKENS_SET";
      rewardsHourData.totalEth = BigInt.fromI32(0);
      rewardsHourData.totalTokens = BigInt.fromI32(0);
      rewardsHourData.totalUsers = BigInt.fromI32(0);
      rewardsHourData.totalNFTHolders = BigInt.fromI32(0);
      rewardsHourData.totalDevs = BigInt.fromI32(0);
      rewardsHourData.userClaimAlpha = BigInt.fromI32(0);
      rewardsHourData.userClaimDelta = BigInt.fromI32(0);
      rewardsHourData.userClaimOmega = BigInt.fromI32(0);
      rewardsHourData.devClaim = BigInt.fromI32(0);
      rewardsHourData.daoClaim = BigInt.fromI32(0);
    }
    return rewardsHourData as RewardsHourData;
  }
  