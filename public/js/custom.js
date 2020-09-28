
$(document).ready(function() {
  // $('.navbar-toggler').click(function() {
  //   $('.navbar-collapse').slideToggle();
  // });

  $("#owl-demo").owlCarousel({
    navigation : true, // Show next and prev buttons
    slideSpeed : 300,
    paginationSpeed : 400,
    singleItem:true,
    items : 1,
    autoPlay: 3000,
    loop: true,
  });

  $("#testimonal").owlCarousel({ 
    navigation : true, // Show next and prev buttons
    slideSpeed : 300,
    paginationSpeed : 400,
    singleItem:true,
    items : 1,
    autoPlay: 3000,
    loop: true,
  });
 
});

// shows different error-modals
function showModal(error, title, content) {
  const modal = document.querySelector('#resultModal');
  const modalHeader = modal.querySelector('.modal-header');
  const modalBody = modal.querySelector('.modal-body');
  const modalTitle = modal.querySelector('.modal-title');
  if (error) { // red header
    modalHeader.classList.remove('bg-success');
    modalHeader.classList.add('bg-danger');
  } else { // green header
    modalHeader.classList.remove('bg-danger');
    modalHeader.classList.add('bg-success');
  }
  modalTitle.innerText = title;
  modalBody.innerHTML = '<p>' + content + '</p>';
  $('#resultModal').modal('show');
}

// for save-btn
function waitBtn(btn, wait, text) {
  btn.innerText = text;
  if (wait) {
    btn.disabled = true;
  } else {
    btn.disabled = false;
  }
}

