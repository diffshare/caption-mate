import { sendToBackground } from "@plasmohq/messaging";
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["*://meet.google.com/*"],
  all_frames: true
}

const cache = {};

const captionSpanObserver = new MutationObserver((mutations) => {
  mutations.forEach(async (mutation) => {
    // 削除されたときに字幕の内容が確定されたものと判断する
    mutation.removedNodes.forEach(async (node) => {
      if (node instanceof HTMLElement && node.tagName === "SPAN") {
        const div = mutation.target.parentNode.parentNode;
        let speaker:{name: string, image: string};
        if (div instanceof HTMLElement && div.tagName === "DIV" && div.children.length === 3) {
          const img = div.children[0] as HTMLImageElement;
          const user = div.children[1] as HTMLDivElement;
          const text = div.children[2] as HTMLDivElement;
          if (img.tagName === "IMG" && user.tagName === "DIV" && text.tagName === "DIV") {
            speaker = {
              name: user.innerText,
              image: img.src
            };
          }
        }
        if (!speaker) return;

        const text = node.innerText;
        if (mutation.previousSibling instanceof HTMLElement && mutation.previousSibling.tagName === "SPAN") {
          const previousSiblingText = mutation.previousSibling.innerText;
          cache[speaker.name + previousSiblingText] = text;
          console.log({cache: text, previousSiblingText});
        } else {
          let completeText = text;
          let query = speaker.name + text;
          while (cache[query]) {
            const nextText = cache[query];
            delete cache[query];
            completeText += nextText;
            query = speaker.name + nextText;
          }

          console.log({completeText});
          // この時点で字幕が確定したので、backgroundに送信
          const resp = await sendToBackground({
            name: "caption",
            body: {
              speaker,
              text: completeText
            }
          })
          console.log(resp);
        }
      }
    });
  });
});
const captionDivObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.tagName === "DIV" && node.children.length === 3) {
          const img = node.children[0] as HTMLElement;
          const user = node.children[1] as HTMLElement;
          const text = node.children[2] as HTMLElement;
          if (img.tagName === "IMG" && user.tagName === "DIV" && text.tagName === "DIV") {
            // 字幕と思わしきタグの祖父の要素に対してspanの削除を開始する
            captionSpanObserver.observe(node.parentNode.parentNode, {
              childList: true,
              subtree: true,
            });
            captionDivObserver.disconnect();
          }
        }
      });
    }
  });
});
captionDivObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
