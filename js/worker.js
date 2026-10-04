// worker.js - chay Python bang Pyodide trong Web Worker.
// Chay trong worker nen trang khong dung hinh, va GIET duoc khi chau viet
// vong lap vo tan. Worker bi terminate() thi app.js dung cai moi.

let pyodide = null;

function goi(id, loai, du) { postMessage({ id, loai, ...du }); }

async function nap(id) {
  if (pyodide) return;
  const { loadPyodide } = await import("../assets/pyodide/pyodide.mjs");
  pyodide = await loadPyodide({
    indexURL: new URL("../assets/pyodide/", self.location.href).href,
    stdout: () => {},
    stderr: () => {},
  });
}

onmessage = async (e) => {
  const { id, loai } = e.data;

  if (loai === "nap") {
    try { await nap(id); goi(id, "san-sang", {}); }
    catch (err) { goi(id, "hong", { loi: String(err) }); }
    return;
  }

  if (loai === "chay") {
    const { ma, stdin } = e.data;
    try {
      await nap(id);

      let ra = "";
      pyodide.setStdout({ batched: (s) => { ra += s + "\n"; } });
      pyodide.setStderr({ batched: (s) => { ra += s + "\n"; } });

      // stdin: cap tung dong mot. Het dong thi tra chuoi rong, giong EOF.
      const dong = (stdin == null ? "" : String(stdin)).split("\n");
      let k = 0;
      pyodide.setStdin({ stdin: () => (k < dong.length ? dong[k++] : "") });

      let loi = null;
      try {
        await pyodide.runPythonAsync(ma);
      } catch (err) {
        loi = String(err && err.message ? err.message : err);
      }
      goi(id, "xong", { ra, loi });
    } catch (err) {
      goi(id, "hong", { loi: String(err) });
    }
    return;
  }
};
