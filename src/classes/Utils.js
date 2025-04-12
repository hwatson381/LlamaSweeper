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
}

export default Utils;