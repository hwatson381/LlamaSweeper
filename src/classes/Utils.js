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
}

export default Utils;