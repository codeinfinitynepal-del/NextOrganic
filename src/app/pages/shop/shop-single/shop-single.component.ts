import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { RedZoomModule } from 'ngx-red-zoom';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Splide from '@splidejs/splide';
import { HeaderComponent } from '../../../header/header.component';
import { FooterComponent } from '../../../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ShopCommonService } from '../../../common/service/shop-common.service';
import { CartEventService } from '../../../common/service/cart-event.service';
import { ProductCardComponent } from '../../../components/product-card/product-card.component';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../shared-services/authService/auth.service';

@Component({
  selector: 'app-shop-single',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    RedZoomModule,
    HeaderComponent,
    FooterComponent,
    ProductCardComponent,
    RouterModule,
  ],
  templateUrl: './shop-single.component.html',
})
export class ShopSingleComponent implements AfterViewInit, OnInit {
  isLoading: boolean = false;
  productId!: number;
  product: any;

  showPopup: boolean = false;
  products: any[] = [];
  relatedProducts: any[] = []; //  थपिएको: रिलेटेड प्रडक्टहरू मात्र राख्नका लागि
  showSuccessToast = false;
  singleProduct: any = '';
  isSubmitting = false;

  //Add to cart
  quantity: number = 1;
  maxQty!: number;

  public baseurl = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public service: ShopCommonService,
    private toastr: ToastrService,
    private authService: AuthService,
    private cartEventService: CartEventService,
  ) {}

  openPopup(packet: any) {
    const event = packet.clickEvent;
    const product = packet.productData;

    event.preventDefault();
    event.stopPropagation();

    this.showPopup = true;
    this.singleProduct = product;
    this.productId = product.id;
    this.maxQty = product.stockQuantity;
  }

  closePopup() {
    this.showPopup = false;
  }

  fetchProductList() {
    this.isLoading = true;
    this.service.getProductsList().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.products = res;
        // ADD THIS
        this.applyRelatedProductsFilter();
      },
      error: (err: any) => {
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  //  थपिएको मुख्य फिल्टर लजिक
  applyRelatedProductsFilter() {
    if (this.products.length > 0 && this.product) {
      this.relatedProducts = this.products.filter(
        (p: any) =>
          p.categoryId === this.product.categoryId && p.id !== this.product.id,
      );
    }
  }

  images = [
    {
      id: 'img1',
      thumb: 'https://scompiler.github.io/red-zoom-angular/assets/image-1.jpg',
      full: 'https://wittlock.github.io/ngx-image-zoom/assets/fullres.jpg',
      alt: 'Front',
    },
    {
      id: 'img2',
      thumb: 'assets/img/products/product-img-2.jpg',
      full: 'assets/img/products/product-img-2.jpg',
      alt: 'Side',
    },
    {
      id: 'img3',
      thumb: 'assets/img/products/product-img-3.jpg',
      full: 'assets/img/products/product-img-3.jpg',
      alt: 'Back',
    },
  ];

  ngOnInit(): void {
    this.fetchProductList();

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.productId = id;

      this.service.getProductById(id).subscribe({
        next: (res: any) => {
          this.product = res;
          this.maxQty = res.stockQuantity;
          this.formattedDescription = this.formatDescription(res.description);
          this.applyRelatedProductsFilter();
        },
      });
    });
  }

  ngAfterViewInit(): void {}

  // Add to cart
  decrease() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  increase() {
    if (this.quantity < this.maxQty) {
      this.quantity++;
    }
  }

  createCart() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      this.toastr.error('Please login to add products to cart');
      this.isLoading = false;
      this.closePopup();
      return;
    }

    let payload = {
      productId: this.productId,
      quantity: this.quantity,
    };

    this.isSubmitting = true;
    this.service.postCart(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.cartEventService.notifyCartUpdate();
        this.showSuccessToast = true;

        setTimeout(() => {
          this.showSuccessToast = false;
          this.closePopup();
        }, 800);
      },
      error: (err: any) => {
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  formattedDescription: any = '';

  private formatDescription(html: string): string {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const container = document.createElement('div');
    container.className = 'product-details';

    let currentColumn: HTMLDivElement | null = null;

    Array.from(doc.body.children).forEach((node) => {
      if (/^H[1-6]$/i.test(node.tagName)) {
        currentColumn = document.createElement('div');
        currentColumn.className = 'detail-column';
        container.appendChild(currentColumn);
      }

      if (!currentColumn) {
        currentColumn = document.createElement('div');
        currentColumn.className = 'detail-column';
        container.appendChild(currentColumn);
      }

      currentColumn.appendChild(node.cloneNode(true));
    });

    return container.outerHTML;
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
