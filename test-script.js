// Simple test script to verify basic functionality
console.log('Script loaded!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Test basic button functionality
    const categoryBtn = document.getElementById('category-game-btn');
    const questionBtn = document.getElementById('question-game-btn');
    
    console.log('Category button:', categoryBtn);
    console.log('Question button:', questionBtn);
    
    if (categoryBtn) {
        categoryBtn.addEventListener('click', function() {
            console.log('Category button clicked!');
            alert('Category button works!');
        });
    }
    
    if (questionBtn) {
        questionBtn.addEventListener('click', function() {
            console.log('Question button clicked!');
            alert('Question button works!');
        });
    }
});