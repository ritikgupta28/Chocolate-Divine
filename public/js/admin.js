const deleteProduct = btn => {
  const prodId = btn.parentNode.querySelector('[name=productId]').value;
  const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

  const productElement = btn.closest('article');
  console.log('1');
  fetch('/admin/product/' + prodId, {
    method: 'DELETE',
    headers: {
      'csrf-token': csrf
    }
  })
    .then(result => {
      console.log('2');
      return result.json();
    })
    .then(data => {
      console.log('3');
      console.log(data);
      productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
      console.log('4');
      console.log(err);
    });
};
