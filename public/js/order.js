var modal = document.querySelectorAll('.openmodal');
for (let i = 0; i < modal.length; i++) {
    modal[i].addEventListener("click", function() {
      var myBookId = $(this).data('id');

       console.log(myBookId);
  
      document.querySelector('#orderid').innerHTML =  myBookId ;

    });
}
// modal.addEventListener("click" ,function () {
//      // var myBookId = $(this).data('id');
//      // $(".modal-body #bookId").val( myBookId );
//      // As pointed out in comments,
//      // it is unnecessary to have to manually call the modal.
//      // $('#addBookDialog').modal('show');
//
//
// });
