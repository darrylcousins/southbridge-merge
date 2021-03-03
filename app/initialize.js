/** @jsx createElement */
/**
 * Initialize module
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/initialize
 */
import "regenerator-runtime/runtime"; // regeneratorRuntime error
import { createElement, Fragment } from "@bikeshaving/crank/cjs";
import { renderer } from "@bikeshaving/crank/cjs/dom";

const makeQuery = async ({url}) => {
  return await fetch(url, {
    method: 'GET',
  })
    .then(response => response.json())
};

const ImageBlank = () => (
  <div class="pa5 bb b--black-10">
    <svg viewBox="0 0 20 20" class="dib" style="fill: #cacaca; color: transparent">
      <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v15A1.5 1.5 0 0 0 2.5 19h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 17.5 1h-15zm5 3.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM16.499 17H3.497c-.41 0-.64-.46-.4-.79l3.553-4.051c.19-.21.52-.21.72-.01L9 14l3.06-4.781a.5.5 0 0 1 .84.02l4.039 7.011c.18.34-.06.75-.44.75z"></path>
    </svg>
  </div>
);

function ProductCardVertical({product}) {
  return (
    <article class="fl br2 ba dark-gray b--black-10 mv4 w-100 w-50-m w-third-l mw6 center">
      { product.image ? (
        <img src={product.image.src} class="db w-100 br2 br--top" alt={product.title} />
      ) : (
        <ImageBlank />
      )}
      <div class="pa2 ph3-ns pb3-ns">
        <div class="dt w-100 mt1">
          <div class="dtc">
            <h1 class="f5 f4-ns mv0">{product.title}</h1>
            <h2 class="f6 f5-ns mv0 black-40">({product.handle})</h2>
          </div>
          <div class="dtc tr">
            <h2 class="f5 mv0">${parseInt(product.variants[0].price)}</h2>
          </div>
        </div>
        <p class="f6 lh-copy measure mt2 mid-gray" innerHTML={product.body_html}>
        </p>
      </div>
    </article>
  );
}

function ProductCard({product}) {
  return (
    <article class="bb b--black-10">
      <a class="db pv4 ph3 ph0-l no-underline black dim" href="#0">
        <div class="flex flex-column flex-row-ns">
          <div class="pr3-ns mb4 mb0-ns w-100 w-25-ns">
            { product.image ? (
              <img src={product.image.src} class="db" alt={product.title} />
            ) : (
              <ImageBlank />
            )}
          </div>
          <div class="w-100 w-60-ns pl3-ns">
            <h1 class="f3 fw1 baskerville mt0 lh-title">{product.title}</h1>
            <p class="f6 f5-l lh-copy black-80" innerHTML={product.body_html}>
            </p>
            <p class="f6 lh-copy mv0 b">${product.variants[0].price}</p>
          </div>
        </div>
      </a>
    </article>
  );
}

function App() {

  const wss = new WebSocket("wss://southbridge.cousinsd.net/");
  wss.onopen = (ev) => console.log("Websocket connected");
  wss.onmessage = async (ev) => {
    const regex = new RegExp(/^\w+/);
    if (regex.test(ev.data)) {
      console.log(ev.data);
    } else {
      try {
        const json = JSON.parse(ev.data)
        if (json.product) {
          const card = document.createElement("div");
          await renderer.render(<ProductCard product={json.product} />, card);
          document.getElementById("websocket-products").appendChild(card);
        }
      } catch(err) {
        console.warn(err);
      }
    }
  }

  const actions = [
    "copy-box-produce",
    "display-box-produce"
  ];

  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "A") {
      const action = ev.target.name.split("?")[0];
      if (actions.includes(action)) {
        const url = `/api/${ev.target.name}`;
        document.getElementById("websocket-products").innerHTML = "";
        makeQuery({url}).then(res => console.log(res));
      };
    }
  });

  const Todo = () => (
    <div>
      <ol class="">
        <li>Set up and test authenticated requests to both sites</li>
        <li>Empty all products from 'southbridge-dev'</li>
        <li>Read and sort products from 'streamsideorganics'</li>
        <li>Import sorted products to 'southbridge-dev'</li>
        <li>Set up authentication to mongodb</li>
        <li>Read boxes and verify with product data - map product ids between sites</li>
      </ol>
    </div>
  );

  return (
    <div>
      <a
        class="link dim pointer pa2"
        name="display-box-produce?type=Box Produce"
        type="button"
      >
        Streamside Produce
      </a>
      <a
        class="link dim pointer pa2"
        name="display-box-produce?type=Container Box"
        type="button"
      >
        Streamside Boxes
      </a>
      <a
        class="link dim pointer pa2"
        name="copy-box-produce?type=Box Produce"
        type="button"
      >
        Copy Produce to Southbridge-Dev
      </a>
      <div class="" id="websocket-text"></div>
      <section class="mw8 center avenir" id="websocket-products"></section>
    </div>
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderer.render(<App />, document.querySelector("#app"));
});
