// new WOW().init();
  function start() {
    document.querySelector('.preloader').style.display = 'none';
    document.querySelector('.afterloader').style.display = 'block';

  }
  var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1W8N6vNM_8leqLLZR1EDRnHgqHTXRDy7e_nB6q21wvAw/edit?usp=sharing';

  function init() {
    Tabletop.init( { key: publicSpreadsheetUrl,
                     callback: showInfo,
                     simpleSheet: true } )
  }

  function showInfo(data, tabletop) {

    console.log(data);
  }

  window.addEventListener('DOMContentLoaded', init);

  function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
  }

  /* Set the width of the side navigation to 0 */
  function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
  }
