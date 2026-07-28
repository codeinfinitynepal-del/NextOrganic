import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
})
export class FooterComponent implements AfterViewInit, OnDestroy {
  showBackToTop = false;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.toggleBackToTopButton);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.toggleBackToTopButton);
    }
  }

  toggleBackToTopButton = (): void => {
    if (typeof window !== 'undefined') {
      this.showBackToTop = window.scrollY > 300;
    }
  };

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }

  // Optional parameter राखिएको छ ताकि Footer बाट वा Product Card बाट दुवै ठाउँबाट प्रयोग गर्न सकियोस्
  chatOnWhatsApp(product?: any): void {
    const phone = '9779841643759'; // तपाईंको मुख्य फोन नम्बर राख्नुहोस्

    let messageText = `Hello, I would like to inquire about Smriti Organic Center.`;

    // यदि प्रडक्ट पास गरिएको छ भने
    if (product && product.productName) {
      messageText = `Hello, I'm interested in ${product.productName}. Price: Rs. ${product.price}`;
    }

    const message = encodeURIComponent(messageText);
    
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  }
}