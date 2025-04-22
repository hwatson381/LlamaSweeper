//Chain class represents a path of chords
//We may include info about the seeds of the chain (where they are, are they locked, does it have multiple seeds)
//We may also also for a chain to be unchorded, if it represents a single left click
class Chain {
  constructor() {
    this.path = [];
    this.isFloatingSeed = true; //Easiest case where there is a single floating seed
    this.seedLocationsIfFixed = []; //Array of {x: ..., y: ...} coords of seeds if the locations are fixed

    this.isUnchordedDig = false; //If this is a single left click
    this.positionIfUnchordedDig = false; // {x: ..., y: ...} coords if it is a single left click

    this.openingsTouched = []; //track which openings this chord chain touches as these don't need to be reprocessed when expanded
  }

  addToPath(x, y) {
    this.path.push({ x, y })
  }

  addOpeningTouched(openingId) {
    this.openingsTouched.includes(openingId) || this.openingsTouched.push(openingId);
  }

  mergeWithPath(arr) {
    this.path = this.path.concat(arr);
  }

  mergeWithOpeningsTouched(arr) {
    for (let openingId of arr) {
      this.openingsTouched.includes(openingId) || this.openingsTouched.push(openingId);
    }
  }

  getClickCount() {
    //Note - be careful with openings?
    if (this.isUnchordedDig) {
      return 1;
    }

    if (this.isFloatingSeed) {
      return this.path.length + 1;
    } else {
      return this.path.length + this.seedLocationsIfFixed.length;
    }
  }

  cloneChain() {
    let replicaChain = new Chain();
    replicaChain.path = this.path.map(el => { return { x: el.x, y: el.y } });
    replicaChain.isFloatingSeed = this.isFloatingSeed;
    replicaChain.seedLocationsIfFixed = this.seedLocationsIfFixed.map(el => { return { x: el.x, y: el.y } });
    replicaChain.isUnchordedDig = this.isUnchordedDig;
    replicaChain.positionIfUnchordedDig = this.positionIfUnchordedDig;
    replicaChain.openingsTouched = this.openingsTouched.slice();
    return replicaChain;
  }
}

export default Chain;