//Class similar to Organised Premiums.
//This allows priorities to be set for every square. Which is used to decide tiebreaks with premiums.

class PriorityPremiums {
  constructor(
    priorityGrid,
    excludeNegativePremiums
  ) {
    this.premiumsMap = new Map();
    //Map of numbers to arrays, where the key is the premium and the value is an array containing all squares of that premium

    this.priorityGrid = priorityGrid;
    this.excludeNegativePremiums = excludeNegativePremiums;
  }

  addPremium(x, y, newPremium) {
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let priority = this.xyToPriority(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [{ x, y, priority }]);
    } else {
      //Find index to insert this
      let idx = this.sortedIndex(premiumArray, priority);

      premiumArray.splice(idx, 0, { x, y, priority });
    }
  }

  lazyAddPremium(x, y, newPremium) {
    //Similar to addPremium, but doesn't store values in order. sortAfterLazyAdd will need to be called later
    //Useful for add premiums in bulk when initialising
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let priority = this.xyToPriority(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [{ x, y, priority }]);
    } else {
      //Append to array as we will be sorting later
      premiumArray.push({ x, y, priority });
    }
  }

  sortAfterLazyAdd() {
    for (let premiumArray of this.premiumsMap.values()) {
      premiumArray.sort((a, b) => a.priority - b.priority);
    }
  }

  removePremium(x, y, oldPremium) {
    if (this.excludeNegativePremiums && oldPremium < 0) {
      return;
    }

    let priority = this.xyToPriority(x, y);
    let premiumArray = this.premiumsMap.get(oldPremium);

    let idx = this.sortedIndex(premiumArray, priority);

    if (premiumArray[idx].priority !== priority) {
      throw new Error("Priority not found in premiums array?");
    }

    premiumArray.splice(idx, 1);

    if (premiumArray.length === 0) {
      this.premiumsMap.delete(oldPremium);
    }
  }

  updatePremium(x, y, oldPremium, newPremium) {
    if (oldPremium === newPremium) {
      return;
    }
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

    let premiumObj = this.premiumsMap.get(highestPremium)[0];
    let { x, y } = premiumObj; //destructure out coords from the premium obj (format {x, y, priority})

    return {
      x,
      y,
      premium: highestPremium,
    };
  }

  xyToPriority(x, y) {
    return this.priorityGrid[x][y];
  }

  /* DELETE ME
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
  */

  sortedIndex(array, value) {
    var low = 0,
      high = array.length;

    while (low < high) {
      var mid = (low + high) >>> 1;
      if (array[mid].priority < value) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

export default PriorityPremiums