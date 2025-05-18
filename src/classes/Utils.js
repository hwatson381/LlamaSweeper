class Utils {
  //Utility to restrict number to range
  static clamp(number, min, max) {
    return Math.max(Math.min(number, max), min);
  }

  //Utility to detect mobile device
  static isMobile() {
    const regex =
      /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
  }

  static deleteValueFromArray(array, itemToRemove) {
    let idx = array.indexOf(itemToRemove);
    if (idx !== -1) {
      array.splice(idx, 1);
      return true;
    } else {
      return false;
    }
  }

  static setTimeoutWrapper(...args) {
    //Required since setTimeout isn't available in templates
    setTimeout(...args);
  }

  static formatTime(seconds) {
    seconds = Math.floor(seconds);
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  //Get human readable time x seconds into the future
  static timeInFuture(seconds) {
    const now = new Date();
    const future = new Date(now.getTime() + seconds * 1000);

    const sameDay = now.toDateString() === future.toDateString();

    const timeString = future.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (sameDay) {
      return `${timeString}`;
    } else {
      const dateString = future.toLocaleDateString();
      return `${timeString} on ${dateString}`;
    }
  }

  static variantToRouteName(variant) {
    const variantRouteMap = {
      normal: "normal",
      "eff boards": "eff-boards",
      "board editor": "board-editor",
      "zini explorer": "zini-explorer",
      "mean openings": "mean-openings",
    };

    if (variantRouteMap[variant]) {
      return variantRouteMap[variant];
    } else {
      return "normal";
    }
  }

  static routeNameToVariant(routeName) {
    const routeVariantMap = {
      normal: "normal",
      "eff-boards": "eff boards",
      "board-editor": "board editor",
      "zini-explorer": "zini explorer",
      "mean-openings": "mean openings",
    }

    if (routeVariantMap[routeName]) {
      return routeVariantMap[routeName];
    } else {
      return "normal";
    }
  }

  static shallowObjectEquals(obj1, obj2) {
    if (obj1 === obj2) {
      return true;
    }

    if (typeof obj1 !== "object" || typeof obj2 !== "object") {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  }

  static shallow2DArrayEquals(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }

    if (arr1[0].length !== arr2[0].length) {
      return false;
    }

    let width = arr1.length;
    let height = arr1[0].length;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (arr1[x][y] !== arr2[x][y]) {
          return false;
        }
      }
    }

    return true;
  }
}

export default Utils;