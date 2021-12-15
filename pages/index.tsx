import type { NextPage } from "next";

import { Layout } from "../components/Layout";

const Home: NextPage = () => {
  return (
    <Layout>
      <div className="info-item">
        <div className="info-item__inner">
          <strong>Achtung:</strong> Wir machen neues Zeug!
        </div>
      </div>
      <div className="content-item full-item">
        <div className="content-item__inner">
          <h2>Weitere Informationen</h2>
          <ul>
            <li>
              Besuche uns auf GitHub:{" "}
              <a href="https://github.com/ForceLabsDev">
                github.com/ForceLabsDev
              </a>
            </li>
            <li>
              Das &raquo;ForceCMS&laquo; erhält momentan keinen Support mehr und
              kann nicht mehr heruntergeladen werden.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
