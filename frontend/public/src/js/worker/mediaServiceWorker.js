/**
 * @author Fabio Compagnoni
 * @version 1.0
 */

self.addEventListener(
    "message",
    async function(e) {
      const urls = e.data;
      const images = await Promise.all(
        urls.map(async url => {
          try {
            const response = await fetch(url);
            const fileBlob = await response.blob();
            return URL.createObjectURL(fileBlob);
          } catch (e) {
            return null;
          }
        })
      );
      self.postMessage(images);
    },
    false
);