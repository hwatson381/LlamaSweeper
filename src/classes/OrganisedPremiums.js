//Data structure to make it easier to find best premiums. Uses binary search
//Read here for context https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
//Rough idea is to convert x,y coord into the order they would be iterated over, and store this in ordered arrays keyed to the premium
class OrganisedPremiums {
  constructor(
    xReverse,
    yReverse,
    xySwap,
    width,
    height,
    excludeNegativePremiums
  ) {
    this.premiumsMap = new Map();
    //Map of numbers to arrays, where the key is the premium and the value is an array containing all squares of that premium

    this.xReverse = xReverse;
    this.yReverse = yReverse;
    this.xySwap = xySwap;
    this.width = width;
    this.height = height;
    this.excludeNegativePremiums = excludeNegativePremiums;
  }

  addPremium(x, y, newPremium) {
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [order]);
    } else {
      //Find index to insert this
      let idx = this.sortedIndex(premiumArray, order);

      premiumArray.splice(idx, 0, order);
    }
  }

  lazyAddPremium(x, y, newPremium) {
    //Similar to addPremium, but doesn't store values in order. sortAfterLazyAdd will need to be called later
    //Useful for add premiums in bulk when initialising
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [order]);
    } else {
      //Append to array as we will be sorting later
      premiumArray.push(order);
    }
  }

  sortAfterLazyAdd() {
    for (let premiumArray of this.premiumsMap.values()) {
      premiumArray.sort((a, b) => a - b);
    }
  }

  removePremium(x, y, oldPremium) {
    if (this.excludeNegativePremiums && oldPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);
    let premiumArray = this.premiumsMap.get(oldPremium);

    let idx = this.sortedIndex(premiumArray, order);

    if (premiumArray[idx] !== order) {
      throw new Error("Order not found in premiums array?");
    }

    premiumArray.splice(idx, 1);

    if (premiumArray.length === 0) {
      this.premiumsMap.delete(oldPremium);
    }
  }

  updatePremium(x, y, oldPremium, newPremium) {
    this.removePremium(x, y, oldPremium);
    this.addPremium(x, y, newPremium);
  }

  getHighestPremium() {
    if (this.premiumsMap.size === 0) {
      if (this.excludeNegativePremiums) {
        //Probably a negative premium, return -1 as this will cause zini to start looking for nf clicks
        return { x: "not stored", y: "not stored", premium: -1 };
      } else {
        throw new Error("Empty map");
      }
    }

    const highestPremium = Math.max.apply(null, [...this.premiumsMap.keys()]);

    let order = this.premiumsMap.get(highestPremium)[0];
    let { x, y } = this.orderToXy(order);

    return {
      x,
      y,
      premium: highestPremium,
    };
  }

  xyToOrder(x, y) {
    let possiblyFlippedX = this.xReverse ? this.width - 1 - x : x;
    let possiblyFlippedY = this.yReverse ? this.height - 1 - y : y;

    if (this.xySwap) {
      return possiblyFlippedY + this.height * possiblyFlippedX;
    } else {
      return possiblyFlippedX + this.width * possiblyFlippedY;
    }
  }

  orderToXy(order) {
    let possiblyFlippedX;
    let possiblyFlippedY;

    if (this.xySwap) {
      possiblyFlippedY = order % this.height;
      possiblyFlippedX = Math.floor(order / this.height);
    } else {
      possiblyFlippedX = order % this.width;
      possiblyFlippedY = Math.floor(order / this.width);
    }

    let x = this.xReverse
      ? this.width - 1 - possiblyFlippedX
      : possiblyFlippedX;
    let y = this.yReverse
      ? this.height - 1 - possiblyFlippedY
      : possiblyFlippedY;

    return { x, y };
  }

  sortedIndex(array, value) {
    var low = 0,
      high = array.length;

    while (low < high) {
      var mid = (low + high) >>> 1;
      if (array[mid] < value) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

export default OrganisedPremiums;