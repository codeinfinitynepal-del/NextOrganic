import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../header/header.component';
import { FooterComponent } from '../../../footer/footer.component';
import { ShopCommonService } from '../../../common/service/shop-common.service';
import { CartEventService } from '../../../common/service/cart-event.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../shared-services/authService/auth.service';


@Component({
  selector: 'app-shop-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './shop-cart.component.html',
})
export class ShopCartComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  isLocalUpdate: boolean = false;
  isQuantityUpdating: boolean = false;
  cartList: any[] = [];
  cartTotalPrice: number = 0;

  shippingCharge: number = 0;
  private cartSubscription!: Subscription;

  public baseurl = environment.apiBaseUrl;

  constructor(
    public service: ShopCommonService,
    public AuthService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private cartEventService: CartEventService
  ) { }

  ngOnInit(): void {
    // 🌟 बाहिरको this.fetchCartList(); यहाँबाट हटाइयो

    // जब अरू कुनै पेज (जस्तै Checkout Page) बाट कार्ट खाली `[]` गरेको अलार्म आउँछ, यसले समात्छ
    this.cartSubscription = this.cartEventService.cartUpdated$.subscribe((updated: any) => {
      if (updated !== undefined && updated !== null) {

        // यदि यो आफ्नै पेजले क्वान्टिटी बढाउँदा वा डिलिट गर्दा बजाएको अलार्म हो भने रोक्ने
        if (this.isLocalUpdate) {
          this.isLocalUpdate = false;
          return;
        }

        // साइडबार वा बाहिरको चेकआउट कम्पोनेन्टबाट नयाँ एरे लिस्ट आयो भने तुरुन्तै सिंक गर्ने
        if (Array.isArray(updated)) {
          this.cartList = updated;
          this.calculateTotal(); // यदि [] आयो भने यसले आफैँ टोटल जिरो बनाउँछ

          // 🌟 मुख्य फिक्स: यदि चेकआउट सक्सेस भएर खाली एरे `[]` आएको हो भने ब्याकेन्ड कल (fetch) हुनबाट रोक्ने
          if (updated.length === 0) {
            this.isLoading = false;
            return;
          }
        } else {
          this.fetchCartList();
        }
      } else {
        // 🌟 BehaviorSubject को पहिलो 'null' भ्यालु आउँदा वा पहिलो पटक पेज खुल्दा मात्र API कल गर्ने
        this.fetchCartList();
      }
    });
  }

  fetchCartList() {
    this.isLoading = true;
    this.service.getCartList().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.cartList = res || [];
        console.log(res, 'cartlist')
        this.calculateTotal();
      },
      error: (err: any) => { this.isLoading = false; }
    });
  }

  calculateTotal() {
    if (this.cartList && this.cartList.length > 0) {
      this.cartTotalPrice = this.cartList.reduce((total: number, item: any) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return total + (price * qty);
      }, 0);
    } else {
      this.cartTotalPrice = 0;
    }
  }

  updateQuantity(event: Event, item: any, change: number) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (this.isQuantityUpdating) return;

    const currentQty = Number(item.quantity) || 1;
    const newQty = currentQty + change;

    if (newQty < 1) return;

    item.quantity = newQty;
    this.calculateTotal();

    this.isQuantityUpdating = true;

    const payload = {
      productId: item.productId,
      quantity: change
    };

    this.service.postCart(payload).subscribe({
      next: (res: any) => {
        this.isQuantityUpdating = false;
        this.isLocalUpdate = true;

        // साइडबार र हेडरलाई अपडेटेड डाटा पठाउने
        this.cartEventService.notifyCartUpdate(this.cartList);
      },
      error: (err: any) => {
        this.isQuantityUpdating = false;
        this.toastr.error('Quantity अपडेट गर्न सकिएन');
        item.quantity = currentQty;
        this.calculateTotal();
      }
    });
  }

  deleteProduct(ID: number) {
    this.isLoading = true;
    this.service.deleteCart(ID).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.toastr.success('Item removed from cart');
        this.isLocalUpdate = true;

        this.cartList = this.cartList.filter(item => item.cartDetailId !== ID);
        this.calculateTotal();

        // साइडबार र हेडरलाई नयाँ लिस्ट पास गर्ने
        this.cartEventService.notifyCartUpdate(this.cartList);
      },
      error: (err: any) => { this.isLoading = false; }
    });
  }


  proceedToCheckout() {
    if (!this.AuthService.isLoggedIn()) {
      this.toastr.warning('Please log in to proceed to checkout.');
      this.router.navigate(['/login']);
      return;
    }
    else if (this.cartList.length === 0) {
      this.toastr.warning('Your cart is empty. Please add items before proceeding to checkout.');
      return;
    }
    else {
      this.router.navigate(['/shop/checkout']);
    }
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}