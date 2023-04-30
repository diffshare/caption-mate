import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["*://meet.google.com/*"],
  all_frames: true
}

const divObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    let text: string;
    let user_name: string;
    let image_src: string;

    // 削除されたときに字幕の内容が確定されたものと判断する
    if (mutation.removedNodes.length > 0) {
      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.tagName === "SPAN") {
          const div = mutation.target.parentNode.parentNode;
          if (div instanceof HTMLElement && div.tagName === "DIV" && div.children.length === 3) {
            const img = div.children[0] as HTMLImageElement;
            const user = div.children[1] as HTMLDivElement;
            const text = div.children[2] as HTMLDivElement;
            if (img.tagName === "IMG" && user.tagName === "DIV" && text.tagName === "DIV") {
              user_name = user.innerText;
              image_src = img.src;
            }
          }
          text = node.innerText;
        }
      });
    }
    if (!text || !user_name || !image_src) {
      return;
    }
    const message = {
      image_src,
      user_name,
      text: text
    };
    // この時点で字幕が確定したので、backgroundに送信

    // TODO: ここでbackgroundに送信する
    console.log({message})
  });
});
const bodyObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.children.length === 3) {
          if (node.tagName === "DIV") {
            const img = node.children[0] as HTMLImageElement;
            const user = node.children[1] as HTMLDivElement;
            const text = node.children[2] as HTMLDivElement;
            if (img.tagName === "IMG" && user.tagName === "DIV" && text.tagName === "DIV") {
              // 字幕と思わしきタグの親要素の変更を監視
              divObserver.observe(node.parentNode, {
                attributes: true,
                characterData: true,
                childList: true,
                subtree: true,
              });
            }
          }
        }
      });
    }
  });
});
bodyObserver.observe(document.body, {
  attributes: true,
  childList: true,
  subtree: true,
});
