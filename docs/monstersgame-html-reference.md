# MonstersGame HTML Parsing Reference

This document captures known HTML structures and parsing cues for MonstersGame pages. Use it as a stable reference when updating scrapers or adding new parsers.

## 1. Training Page (`?ac=training`)

- Page URL: `https://{server}/index.php?ac=training`
- HTML structure:
  - Main content in `#maincontent`.
  - Gold balance appears as `Tu oro:` in a table row.
  - Training table contains entries with `typ=staerke|verteidigung|gewandtheit|ausdauer|charisma`.
  - Statbar contains skill values in the footer block.
- Key selectors for parsing:
  - Gold balance: `Tu oro:` followed by number and `<img alt="Oro">`.
  - Skills table: rows with `typ=staerke|verteidigung|gewandtheit|ausdauer|charisma`.
  - Statbar: `#statbarStatDetails`.
- Sample values:
  - Gold: `758,06`
  - Training type: `typ=staerke`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Oro disponible:</div>
  <div class="pageContent">
    <table width="100%" border="0">
      <tbody>
        <tr>
          <td class="tdn">Tu oro:</td>
          <td class="tdn">758,06 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="headerRow">Habilidades:</div>
  <div class="pageContent">
    <table width="100%" border="0">
      <tbody>
        <tr>
          <td class="tdh">Entrenamiento</td>
          <td class="tdh">Nivel actual</td>
          <td class="tdh">Coste</td>
          <td class="tdh">Accion</td>
        </tr>
        <tr>
          <td>Fuerza</td>
          <td>64</td>
          <td>184,00 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
          <td><a href="index.php?ac=training&amp;typ=staerke">Entrenamiento (coste) 184,00</a></td>
        </tr>
        <tr>
          <td>Defensa</td>
          <td>62</td>
          <td>176,00 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
          <td><a href="index.php?ac=training&amp;typ=verteidigung">Entrenamiento (coste) 176,00</a></td>
        </tr>
        <tr>
          <td>Agilidad</td>
          <td>66</td>
          <td>196,00 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
          <td><a href="index.php?ac=training&amp;typ=gewandtheit">Entrenamiento (coste) 196,00</a></td>
        </tr>
        <tr>
          <td>Resistencia</td>
          <td>70</td>
          <td>225,00 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
          <td><a href="index.php?ac=training&amp;typ=ausdauer">Entrenamiento (coste) 225,00</a></td>
        </tr>
        <tr>
          <td>Destreza</td>
          <td>63</td>
          <td>180,00 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
          <td><a href="index.php?ac=training&amp;typ=charisma">Entrenamiento (coste) 180,00</a></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<div id="statbar">
  <div class="statbarRow">
    <span class="statbarEntry">Vampiro xaz</span>
    <span class="statbarEntry">Energía vital: 741 / 800</span>
    <span class="statbarEntry">Oro: <span id="goldbalance">758,06</span></span>
    <span class="statbarEntry">Sangre: <span id="bloodbalance">415</span></span>
    <span class="statbarEntry">Experiencia: 1442 / 1445</span>
  </div>
  <div id="statbarStatDetails">
    Fuerza: 64<br>
    Defensa: 62<br>
    Agilidad: 66<br>
    Resistencia: 70<br>
    Destreza: 63
  </div>
</div>
```

</details>

## 2. Attack Messages Page (`?ac=nachrichten&sac=angriff`)

- Page URL: `https://{server}/index.php?ac=nachrichten&sac=angriff`
- HTML structure:
  - Message list contains fight report links per row.
  - Rival profile links appear as `ac=showuser&showuserid=ID`.
  - Pagination uses `&count=0|10|20` and/or a page dropdown.
- Key selectors for parsing:
  - Fight report links: `ac=fightreport&amp;fightid=ID&amp;sac=angriff`.
  - Rival user links: `ac=showuser&amp;showuserid=ID`.
  - Pagination: `&count=0|10|20` or `page=N` dropdown.
- Sample values:
  - Fight report ID: `fightid=123456`
  - Rival ID: `showuserid=98765`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">

    <div class="headerRowSC">
    <a href="index.php?ac=nachrichten&amp;sac=newmsg">Nuevo mensaje</a> <img src="..." alt="">
  <a href="index.php?ac=nachrichten&amp;sac=posteingang">Mensajes entrantes</a> <img src="..." alt="">
  <a href="index.php?ac=nachrichten&amp;sac=postausgang">Mensajes de salida</a> <img src="..." alt="">
  <a href="index.php?ac=nachrichten&amp;sac=angriff" class="subnav_active">Informes (ataque)</a> <img src="..." alt="">
  <a href="index.php?ac=nachrichten&amp;sac=verteidigung">Informes (defensa)</a> <img src="..." alt="">
  <a href="index.php?ac=nachrichten&amp;sac=arenareport">Reportes de la Arena</a>
    </div>

  <div class="headerRow">Informes (ataque)</div>
  <div class="pageContent">
    <table width="100%" border="0">
    <tbody><tr>
      <td class="tdh">Fecha:</td>
      <td class="tdh">Victimas</td>
      <td class="tdh">Vencedor/a:</td>
      <td class="tdh">Botín</td>
      <td class="tdh">Acción:</td>
    </tr>
    <tr>
      <td> del dia 06.02.2026 a las 23:46:30</td>
      <td><a href="index.php?ac=showuser&amp;showuserid=13112498">lican agnvs</a></td>
      <td>xaz</td>
      <td>1 <img src="..." alt="Oro" style="vertical-align:middle;"></td>
      <td><a href="index.php?ac=fightreport&amp;fightid=12974465&amp;sac=angriff">Mostrar informe</a></td>
    </tr>
    <!-- More rows... -->
    </tbody></table>

    <!-- Pagination -->
    <select name="page" onchange="this.form.submit();">
      <option value="1" selected="selected">1 - 10</option>
      <option value="2">11 - 20</option>
      <option value="3">21 - 28</option>
    </select>
    <a href="index.php?ac=nachrichten&amp;sac=angriff&amp;count=10"> adelante &gt;&gt;&gt;</a>
  </div>
</div>
```

</details>

## 3. Fight Report Page (`?ac=fightreport&fightid=ID&sac=angriff`)

- Page URL: `https://{server}/index.php?ac=fightreport&fightid=ID&sac=angriff`
- HTML structure:
  - Winner banner appears in a `headerRowCWinner` block.
  - Two columns for combatants; left is user, right is rival.
  - Loot and XP appear as text with `<img alt="Oro">` and experience phrases.
- Key selectors for parsing:
  - Winner: `<div class="headerRowCWinner">Vencedor/a: NAME</div>`.
  - User (left side): first `<td colspan="2" class="tdh">Race Name</td>`.
  - Rival (right side): second `<td colspan="2" class="tdh">Race Name</td>`.
  - Loot/XP: `Ha conseguido X <img alt="Oro">` and `Y punto(s) de experiencia`.
- Sample values:
  - Winner: `Vencedor/a: Nyx`
  - Loot: `Ha conseguido 123,45 <img alt="Oro">`
  - XP: `12 puntos de experiencia`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Informe de combate</div>
  <div class="headerRowCWinner">Vencedor/a: xaz</div>

  <div class="pageContent">
    <table width="100%" border="0">
      <tbody>
        <tr>
          <td colspan="2" class="tdh">Vampiro xaz</td>
          <td></td>
          <td colspan="2" class="tdh">Hombre Lobo lican agnvs</td>
        </tr>
        <tr>
          <td class="tdn">Nivel</td>
          <td class="tdn">46</td>
          <td></td>
          <td class="tdn">Nivel</td>
          <td class="tdn">45</td>
        </tr>
        <tr>
          <td class="tdn">Fuerza</td>
          <td class="tdn">64</td>
          <td></td>
          <td class="tdn">Fuerza</td>
          <td class="tdn">61</td>
        </tr>
        <tr>
          <td class="tdn">Defensa</td>
          <td class="tdn">62</td>
          <td></td>
          <td class="tdn">Defensa</td>
          <td class="tdn">59</td>
        </tr>
        <tr>
          <td class="tdn">Agilidad</td>
          <td class="tdn">66</td>
          <td></td>
          <td class="tdn">Agilidad</td>
          <td class="tdn">60</td>
        </tr>
        <tr>
          <td class="tdn">Resistencia</td>
          <td class="tdn">70</td>
          <td></td>
          <td class="tdn">Resistencia</td>
          <td class="tdn">68</td>
        </tr>
        <tr>
          <td class="tdn">Destreza</td>
          <td class="tdn">63</td>
          <td></td>
          <td class="tdn">Destreza</td>
          <td class="tdn">61</td>
        </tr>
      </tbody>
    </table>

    <div class="headerRow">Equipo</div>
    <table width="100%" border="0">
      <tbody>
        <tr>
          <td class="tdh" width="45%">xaz</td>
          <td width="10%"></td>
          <td class="tdh" width="45%">lican agnvs</td>
        </tr>
        <tr>
          <td>
            <img src="..." alt="Espada" style="vertical-align:middle;"> Espada antigua<br>
            <img src="..." alt="Armadura" style="vertical-align:middle;"> Armadura oscura
          </td>
          <td></td>
          <td>
            <img src="..." alt="Garra" style="vertical-align:middle;"> Garra de plata<br>
            <img src="..." alt="Piel" style="vertical-align:middle;"> Piel endurecida
          </td>
        </tr>
      </tbody>
    </table>

    <div class="headerRow">Centinela</div>
    <div class="pageContent">
      <img src="..." alt="Sentinel" style="vertical-align:middle;"> Ningun centinela
    </div>

    <div class="headerRow">Informe detallado</div>
    <div class="pageContent">
      xaz Ha conseguido 1 <img src="..." alt="Oro" style="vertical-align:middle;">. A xaz le han sido sumados 0 punto(s) de experiencia mientras que lican agnvs ha recibido 1 punto(s) de experiencia.
    </div>
  </div>
</div>
```

</details>

## 4. Hunt/Raid Page (`?ac=raubzug`)

- Page URL: `https://{server}/index.php?ac=raubzug`
- HTML structure:
  - Manhunt form with `sac=vampir` and `jagdzeit=seconds`.
  - PvP search form with `searchname` and `searchopt`.
  - Attack form with `sac=attack` and `gegnerid=ID`.
- Key selectors for parsing:
  - Manhunt: `sac=vampir` with `jagdzeit` input.
  - PvP search: inputs `searchname`, `searchopt`.
  - Attack: `sac=attack`, `gegnerid=ID`.
- Sample values:
  - `jagdzeit=600`
  - `searchopt=level`
  - `gegnerid=123456`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Caza de humanos</div>
  <div class="pageContent">
    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="raubzug">
      <input type="hidden" name="sac" value="vampir">
      <select name="jagdzeit">
        <option value="600">10 minutos</option>
        <option value="1200">20 minutos</option>
        <option value="1800">30 minutos</option>
        <option value="2400">40 minutos</option>
        <option value="3000">50 minutos</option>
        <option value="3600">60 minutos</option>
      </select>
      <input type="submit" value="Cazar">
    </form>
  </div>

  <div class="headerRow">Caza de adversarios</div>
  <div class="pageContent">
    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="raubzug">
      <input type="hidden" name="sac" value="gegner">
      <input type="text" name="searchname" value="" placeholder="Nombre del rival">
      <select name="searchopt">
        <option value="level">Nivel</option>
        <option value="gold">Oro</option>
        <option value="none">Aleatorio</option>
      </select>
      <input type="submit" value="Buscar">
    </form>
    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="raubzug">
      <input type="hidden" name="sac" value="gegner">
      <select name="searchopt">
        <option value="level">Nivel</option>
        <option value="gold">Oro</option>
        <option value="none">Aleatorio</option>
      </select>
      <input type="submit" value="Busqueda aleatoria">
    </form>
  </div>
</div>
```

</details>

## 5. Store/Potions Page (`?ac=stadt&sac=warenhaendler&prod_group=4`)

- Page URL: `https://{server}/index.php?ac=stadt&sac=warenhaendler&prod_group=4`
- HTML structure:
  - Potion entries list `item_id` values.
  - Price shown with `Precio (compra): X,XX <img alt="Oro">`.
  - Level requirements listed per item.
  - Buy links use `action=buy&item_id=N`.
- Key selectors for parsing:
  - Potion entries: `item_id` in entry rows.
  - Price parsing: `Precio (compra): X,XX <img alt="Oro">`.
  - Level requirements: `Requerimientos: nivel del personaje N`.
  - Buy link: `action=buy&item_id=N`.
- Sample values:
  - `item_id=8`
  - `Precio (compra): 900,00 <img alt="Oro">`
  - `Requerimientos: nivel del personaje 20`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Mercader de pociones</div>
  <div class="pageContent">
    <table width="100%" border="0">
      <tbody>
        <tr>
          <td class="tdh">Articulo</td>
          <td class="tdh">Precio (compra)</td>
          <td class="tdh">Requerimientos</td>
          <td class="tdh">Accion</td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (50)</td>
          <td>49,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 1</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=1&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=1&amp;prod_group=4">Vender</a>
          </td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (100)</td>
          <td>89,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 2</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=2&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=2&amp;prod_group=4">Vender</a>
          </td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (500)</td>
          <td>445,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 10</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=7&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=7&amp;prod_group=4">Vender</a>
          </td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (1000)</td>
          <td>891,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 20</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=8&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=8&amp;prod_group=4">Vender</a>
          </td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (2500)</td>
          <td>2200,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 40</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=10&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=10&amp;prod_group=4">Vender</a>
          </td>
        </tr>
        <tr>
          <td>Esencia de fortaleza (5000)</td>
          <td>4250,00 <img src="..." alt="Oro"></td>
          <td>Requerimientos: nivel del personaje 60</td>
          <td>
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=buy&amp;item_id=11&amp;prod_group=4">Comprar</a>
            |
            <a href="index.php?ac=stadt&amp;sac=warenhaendler&amp;action=sell&amp;item_id=11&amp;prod_group=4">Vender</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

</details>

## 6. Specific Potion Buy Page

- Page URL: `https://{server}/index.php?ac=stadt&sac=warenhaendler&action=buy&item_id=N&prod_group=4`
- HTML structure:
  - Hidden form fields: `item_id`, `cur_price`, `num_items`, `currency=gold`.
  - Current inventory count appears near item description.
- Key selectors for parsing:
  - Hidden form inputs: `item_id`, `cur_price`, `num_items`, `currency=gold`.
  - Inventory quantity: item description block.
- Sample values:
  - `item_id=8`
  - `cur_price=900`
  - `num_items=1`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Esencia de fortaleza (500)</div>
  <div class="pageContent">
    <form action="index.php" method="post" name="merchantform">
      <input type="hidden" name="ac" value="stadt">
      <input type="hidden" name="prod_group" value="4">
      <input type="hidden" name="item_id" value="7">
      <input type="hidden" name="num_items" value="1">
      <input type="hidden" name="cur_price" value="445">
      <input type="hidden" name="currency" value="gold">
      <input type="hidden" name="action" value="buy">
      <input type="hidden" name="upgrade_level" value="0">
      <input type="hidden" name="bonus_gold" value="">
      <input type="hidden" name="server_amount" value="445">
      <input type="hidden" name="portal_amount" value="0">

      <table width="100%" border="0">
        <tbody>
          <tr>
            <td class="tdn">Precio (compra):</td>
            <td class="tdn">445,00 <img src="..." alt="Oro"></td>
          </tr>
          <tr>
            <td class="tdn">Cantidad:</td>
            <td class="tdn"><input type="text" name="num_items" value="1" size="5" onchange="calculate();"></td>
          </tr>
        </tbody>
      </table>
      <input type="submit" value="Comprar">
    </form>
  </div>
  <script type="text/javascript">
    function calculate() {
      var price = 445;
      var qty = parseInt(document.merchantform.num_items.value, 10) || 1;
      var total = price * qty;
      document.merchantform.server_amount.value = total;
    }
  </script>
</div>
```

</details>

## 7. Graveyard Work Page (`?ac=friedhof`)

- Page URL: `https://{server}/index.php?ac=friedhof`
- HTML structure:
  - Work form uses `sac=startjob` and `arbeitszeit=hours`.
  - Job title and hourly wage appear near form description.
- Key selectors for parsing:
  - Work form: `sac=startjob`, `arbeitszeit=hours`.
  - Wage text: job title with hourly wage.
- Sample values:
  - `arbeitszeit=6`
  - `5 Oro por hora`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Cementerio</div>
  <div class="pageContent">
    <div class="contentTitle">Incinerador de cadáveres</div>
    <div class="contentText">Salario: 80 Oro por hora</div>

    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="friedhof">
      <input type="hidden" name="sac" value="startjob">
      <label for="arbeitszeit">Duracion:</label>
      <select name="arbeitszeit" id="arbeitszeit">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
      </select>
      <input type="submit" value="Trabajar">
    </form>

    <img src="..." usemap="#graveyard" alt="Cementerio">
    <map name="graveyard">
      <area shape="rect" coords="10,10,180,120" href="index.php?ac=friedhof&amp;sac=startjob" alt="Trabajar">
    </map>
  </div>
</div>
```

</details>

## 8. Manhunt Underway Page

- Page URL: `https://{server}/index.php?ac=raubzug`
- HTML structure:
  - Countdown timer uses `var SecondsCOUNTER = N;`.
  - Header `Caza de adversarios` with text like `In X minutes`.
- Key selectors for parsing:
  - Timer: `var SecondsCOUNTER = N;`.
  - Header: `<div class="headerRow">Caza de adversarios</div>`.
- Sample values:
  - `SecondsCOUNTER = 600;`
  - `In 9 minutes`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Caza de adversarios</div>
  <div class="pageContent">
    You are now on a manhunt. In 9 minutes your loot will be ready.
    <br>
    <a href="index.php?ac=raubzug&amp;sac=pay&amp;currency=bloodcrystals">Speed up with blood crystals</a>
  </div>
  <script type="text/javascript">
    var SecondsCOUNTER = 600;
    var ac = 'raubzug';
  </script>
</div>
```

</details>

## 9. Hunt Result Page

- Page URL: `https://{server}/index.php?ac=raubzug`
- HTML structure:
  - Result header: `Resultado de la caza`.
  - Loot lines include blood, gold, and experience.
  - Repeat form contains `sac=vampir` and `jagdzeit`.
- Key selectors for parsing:
  - Result header: `<div class="headerRow">Resultado de la caza</div>`.
  - Loot parsing: `received X litros de sangre`, `X,XX <img alt="Oro">`, `X experience points`.
  - Repeat form: `sac=vampir`, `jagdzeit=previousValue`.
- Sample values:
  - `20 litros de sangre`
  - `75,00 <img alt="Oro">`
  - `8 experience points`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Resultado de la caza</div>
  <div class="pageContent">
    You received 57 litros de sangre as well as 58,00 <img src="..." alt="Oro"> gold coins.
    In addition, you collected 2 experience points.
  </div>

  <div class="pageContent">
    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="raubzug">
      <input type="hidden" name="sac" value="vampir">
      <input type="hidden" name="jagdzeit" value="600">
      <input type="submit" value="Cazar de nuevo">
    </form>
  </div>
</div>
```

</details>

## 10. PvP Enemy Search Result Page

- Page URL: `https://{server}/index.php?ac=raubzug&sac=gegner`
- HTML structure:
  - Success text: `Your search was successful`.
  - Found enemy form includes `gegnerid=ID`.
  - Enemy info shows race, name, level, and skills.
- Key selectors for parsing:
  - Success: `Your search was successful`.
  - Found enemy form: `gegnerid=ID`.
  - Enemy info: race, name, level, skills.
- Sample values:
  - `gegnerid=123456`
  - `Vampire Nyx (Level 42)`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Exitoso</div>
  <div class="pageContent">
    Your search was successful.
  </div>

  <div class="pageContent">
    <div class="headerRow">Vampiro Xyra (Nivel 48)</div>
    <div class="contentText">Fuerza: 68 | Defensa: 66 | Agilidad: 70 | Resistencia: 69 | Destreza: 64</div>
  </div>

  <div class="pageContent">
    <form action="index.php" method="post">
      <input type="hidden" name="ac" value="raubzug">
      <input type="hidden" name="sac" value="attack">
      <input type="hidden" name="gegnerid" value="13027425">
      <input type="submit" value="Atacar">
    </form>
  </div>
</div>
```

</details>

## 11. PvP Cooldown Page

- Page URL: `https://{server}/index.php?ac=raubzug`
- HTML structure:
  - Cooldown text: `You can only fight every 15 minutes`.
  - Timer: `var SecondsCOUNTER = N;`.
  - Header: `<div class="headerRow">Caza de adversarios</div>`.
- Key selectors for parsing:
  - Cooldown text: `You can only fight every 15 minutes`.
  - Timer: `var SecondsCOUNTER = N;`.
  - Header: `<div class="headerRow">Caza de adversarios</div>`.
- Sample values:
  - `SecondsCOUNTER = 900;`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Caza de adversarios</div>
  <div class="pageContent">
    You can only fight every 15 minutes.
  </div>
  <script type="text/javascript">
    var SecondsCOUNTER = 835;
    var ac = 'cooldown';
  </script>
</div>
```

</details>

## 12. Graveyard Work Cooldown Page

- Page URL: `https://{server}/index.php?ac=friedhof`
- HTML structure:
  - Working text: `You have now started working`.
  - Cancel link: `?ac=friedhof&sac=cancel`.
  - Timer includes `var SecondsCOUNTER = N;` with `ac='friedhof'`.
- Key selectors for parsing:
  - Working text: `You have now started working`.
  - Cancel link: `?ac=friedhof&sac=cancel`.
  - Timer: `var SecondsCOUNTER = N;` with `ac='friedhof'`.
- Sample values:
  - `SecondsCOUNTER = 3600;`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">Caza de adversarios</div>
  <div class="pageContent">
    You have now started working. Return here in 1 hour to collect your payment.
    <br>
    <a href="index.php?ac=friedhof&amp;sac=cancel">Cancel job</a>
  </div>
  <script type="text/javascript">
    var SecondsCOUNTER = 3600;
    var ac = 'friedhof';
  </script>
</div>
```

</details>

## 13. Work Complete Page

- Page URL: `https://{server}/index.php?ac=friedhof`
- HTML structure:
  - Completion text: `You are finished working`.
  - Cancellation text: `cancelado tu trabajo`.
- Key selectors for parsing:
  - Completion text: `You are finished working`.
  - Cancelled text: `cancelado tu trabajo`.
- Sample values:
  - `You are finished working`
  - `cancelado tu trabajo`

<details>
<summary>Raw HTML</summary>

```html
<div id="maincontent" style="min-height:250px;">
  <div class="headerRow">You are finished working.</div>
  <div class="pageContent">
    Has cancelado tu trabajo del cementerio y has recibido 0 Oro.
  </div>
</div>
```

</details>

## 14. Statbar (Common Footer)

- Page URL: Common footer across pages.
- HTML structure:
  - Race and name appear in statbar entries.
  - Stamina uses `Energia vital:` label.
  - Gold and blood balances use `#goldbalance` and `#bloodbalance` spans.
  - Experience line shows `Experiencia: X / Y`.
  - Skills details in `#statbarStatDetails`.
- Key selectors for parsing:
  - Race/name: `<span class="statbarEntry">Vampiro NAME</span>`.
  - Stamina: `Energia vital: X`.
  - Gold: `<span id="goldbalance">X,XX</span>`.
  - Blood: `<span id="bloodbalance">X</span>`.
  - Experience: `Experiencia: X / Y`.
  - Skills details: `<div id="statbarStatDetails">Fuerza: X<br>...</div>`.
- Sample values:
  - `Vampiro Nyx`
  - `Energia vital: 450 / 800`
  - `Experiencia: 12.345 / 14.000`

<details>
<summary>Raw HTML</summary>

```html
<div id="statbar">
  <div class="statbarRow">
    <span class="statbarEntry">Vampiro xaz</span>
    <span class="statbarEntry">Energía vital: 741 / 800</span>
    <span class="statbarEntry">Oro: <span id="goldbalance">758,06</span></span>
    <span class="statbarEntry">Sangre: <span id="bloodbalance">415</span></span>
    <span class="statbarEntry">Experiencia: 1442 / 1445</span>
  </div>
  <div id="statbarStatDetails">
    Fuerza: 64<br>
    Defensa: 62<br>
    Agilidad: 66<br>
    Resistencia: 70<br>
    Destreza: 63
  </div>
</div>
```

</details>

## 15. Multi-language Text Patterns

| Concept | Spanish | English | German |
|---------|---------|---------|--------|
| Strength | Fuerza | Strength | Stärke |
| Defense | Defensa | Defense | Verteidigung |
| Agility | Agilidad | Agility | Gewandtheit |
| Constitution | Resistencia | Stamina | Ausdauer |
| Dexterity | Destreza | Dexterity | Charisma |
| Vampire | Vampiro/Vampira | Vampire | Vampir |
| Werewolf | Hombre Lobo | Werewolf | Werwolf |
| Health/Stamina | Energía vital | Health | Lebensenergie |
| Gold | Oro | Gold | Gold |
| Experience | Experiencia | Experience | Erfahrung |
| Winner | Vencedor/a | Winner | Sieger |
| Level | Nivel | Level | Stufe |
| Attack | Ataque | Attack | Angriff |
| Defense report | Informes (defensa) | Reports (defense) | Verteidigungsberichte |
| Manhunt | Caza de humanos | Human hunt | Menschenjagd |
| PvP Hunt | Caza de adversarios | Opponent hunt | Gegnerjagd |
| Graveyard | Cementerio | Graveyard | Friedhof |
| Working | Trabajando | Working | Arbeit |
| Cooldown phrases | "solo puedes luchar cada" | "You can only fight every" | "du kannst nur alle" |
