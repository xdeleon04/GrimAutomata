import { fetchMonstersGameData } from "@/services/monsters-game";

const mockFetch = jest.fn();
global.fetch = mockFetch;

// A robust mock response helper that is compatible with the test environment's parser.
const createMockResponse = (
  body: string,
  headers?: any,
  status: number = 200,
) =>
  Promise.resolve({
    url: "https://s1.monstersgame.es/index.php",
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "content-type" ? "text/html" : headers?.[h] || null,
      getSetCookie: () => headers?.["Set-Cookie"] || [],
    },
    text: () =>
      Promise.resolve(`<!DOCTYPE html><html><body>${body}</body></html>`),
    json: () => Promise.resolve(JSON.parse(body)),
  });

// Corrected 3-step login flow.
const MOCK_LOGIN_FLOW = [
  () =>
    createMockResponse('<input name="csrfmiddlewaretoken" value="token123" />'),
  () =>
    createMockResponse(
      "Redirecting",
      { "Set-Cookie": ["sessionid=session123"], Location: "/?n=" },
      302,
    ),
  () => createMockResponse("Redirected"), // This is the single redirect after login
];

describe("fetchMonstersGameData", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation(() =>
      createMockResponse("<div>Empty messages</div>"),
    );
  });

  it("should fetch and parse data correctly when idle", async () => {
    const statusHtml = `<span id="char_level">Nivel 10</span><span id="goldbalance">1.234,56</span><span>Vampiro</span><p>Energía vital: (100 / 100)</p>`;
    const huntPageHtml = `<p>Ya has usado todo tu tiempo de caza</p><span>Vampiro</span>`;
    const finalSyncHtml = `<span id="char_level">Nivel 10</span><span id="goldbalance">1.234,56</span><span>Energía vital: (100 / 100)</span><span>Vampiro</span>`;

    mockFetch
      .mockImplementationOnce(MOCK_LOGIN_FLOW[0])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[1])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[2])
      .mockImplementationOnce(() => createMockResponse(statusHtml))
      .mockImplementationOnce(() => createMockResponse(huntPageHtml)) // Hunt check (idle)
      .mockImplementationOnce(() => createMockResponse(finalSyncHtml)); // Final sync

    const data = await fetchMonstersGameData(
      "testuser",
      "password",
      "s1.monstersgame.es",
      false,
    );
    expect(data?.stats.level).toBe(10);
    expect(data?.stats.gold).toBe(1234.56);
  });

  it("should trigger auto-work when stamina is low", async () => {
    const initialStatus = `<span id="goldbalance">100</span><span>Energía vital: (5 / 100)</span><span>Vampiro</span>`;
    const workResponse = `<script>var SecondsCOUNTER = 7200;</script><span>Energía vital: (5 / 100)</span><span>Vampiro</span>`;

    mockFetch
      .mockImplementationOnce(MOCK_LOGIN_FLOW[0])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[1])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[2])
      .mockImplementationOnce(() => createMockResponse(initialStatus)) // -> Enters WORK branch
      .mockImplementationOnce(() => createMockResponse(workResponse)) // Work POST action
      .mockImplementationOnce(() => createMockResponse(workResponse)); // Final sync

    const settings = { auto_work: true, stamina_reserve: "10" };
    const data = await fetchMonstersGameData(
      "testuser",
      "password",
      "s1.monstersgame.es",
      false,
      settings,
    );

    expect(
      data?.logs.find(
        (l) =>
          l.message ===
          "Shadow Ritual: Graveyard shift started for 2h. Earning gold while resting.",
      ),
    ).toBeDefined();
    expect(data?.pvpCooldown).toBe(7200);
  });

  it("should trigger a PvP attack when manhunt limit is reached", async () => {
    const statusHtml = `<span id="goldbalance">100</span><span>Energía vital: (95/100)</span><span>Vampiro</span>`;
    const huntPageHtml = `ya has usado todo tu tiempo de caza<span>Vampiro</span>`;
    const searchResultHtml = `<input name="gegnerid" value="12345"><div class="headerRow">Vampiro RivalPlayer</div><span>Vampiro</span>`;
    const attackResultHtml = `<div class="headerRowCWinner">Vencedor/a: testuser</div>testuser Ha conseguido 5,00 <img src="" alt="Oro"> gold. 3 punto(s) de experiencia<script>var SecondsCOUNTER = 900;</script><span>Energía vital: (95 / 100)</span><span>Vampiro</span>`;

    mockFetch
      .mockImplementationOnce(MOCK_LOGIN_FLOW[0])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[1])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[2])
      .mockImplementationOnce(() => createMockResponse(statusHtml)) // -> Enters COMBAT branch
      .mockImplementationOnce(() => createMockResponse(huntPageHtml)) // Hunt check -> limit reached
      .mockImplementationOnce(() => createMockResponse(searchResultHtml)) // PvP search
      .mockImplementationOnce(() => createMockResponse(attackResultHtml)) // PvP attack
      .mockImplementationOnce(() => createMockResponse(attackResultHtml)); // Final sync

    const settings = { pvp_attack: true, pvp_target_name: "RivalPlayer" };
    const data = await fetchMonstersGameData(
      "testuser",
      "password",
      "s1.monstersgame.es",
      false,
      settings,
    );

    expect(
      data?.logs.find(
        (l) =>
          l.message ===
          "PvP Ritual: VICTORY vs RivalPlayer. Loot: 5.00 gold, 3 XP.",
      ),
    ).toBeDefined();
    expect(data?.pvpCooldown).toBe(900);
  });

  it("should trigger auto-training when idle and has gold", async () => {
    const statusHtml = `<span id="goldbalance">500</span><span>Energía vital: (100/100)</span><span>Vampiro</span>`;
    const idleHuntPage = `<script>var SecondsCOUNTER = 0;</script><span>Vampiro</span>`;
    const trainingPageHtml = `<p>Tu oro: 500</p><a href="?ac=training&typ=staerke">Entrenamiento (coste) 100</a><span>Vampiro</span>`;
    const trainingResultHtml = `Has entrenado.<span>Vampiro</span>`;
    const finalStatusHtml = `<span id="goldbalance">400</span><span>Energía vital: (100 / 100)</span><span>Vampiro</span>`;

    mockFetch
      .mockImplementationOnce(MOCK_LOGIN_FLOW[0])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[1])
      .mockImplementationOnce(MOCK_LOGIN_FLOW[2])
      .mockImplementationOnce(() => createMockResponse(statusHtml)) // -> Enters COMBAT branch
      .mockImplementationOnce(() => createMockResponse(idleHuntPage)) // Hunt check -> idle
      .mockImplementationOnce(() => createMockResponse(trainingPageHtml)) // Training page fetch
      .mockImplementationOnce(() => createMockResponse(trainingResultHtml)) // Training action
      .mockImplementationOnce(() => createMockResponse(finalStatusHtml)); // Final sync

    const settings = {
      auto_training: true,
      train_strength: true,
      stamina_reserve: "0",
    };
    const data = await fetchMonstersGameData(
      "testuser",
      "password",
      "s1.monstersgame.es",
      false,
      settings,
    );

    expect(
      data?.logs.find(
        (l) =>
          l.message === "Shadow Training: Enhanced Fuerza for 100.00 gold.",
      ),
    ).toBeDefined();
    expect(data?.stats.gold).toBe(400);
  });
});
